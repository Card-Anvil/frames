import { readFileSync } from "node:fs";
import path from "node:path";
import type ts from "typescript";

import { type FramePath, formatPath } from "../../../manifest/walk.js";
import { resolveModuleFile } from "./resolveModule.js";
import { type SourceIndex, isUnderRoot, normalizeFile } from "./sourceIndex.js";
import type { TypeScriptApi } from "./ts.js";

/** Why a value cannot be edited where it is written. */
export type UnsupportedReason =
  | "computed"
  | "helper-call"
  | "not-a-literal"
  | "outside-root"
  | "missing-property"
  | "unsupported-expression"
  | "no-export"
  | "unreadable";

export interface SourceLocation {
  /** Absolute, normalized. */
  readonly file: string;
  /** 1-based. */
  readonly line: number;
  /** 1-based. */
  readonly column: number;
}

export interface ResolvedLiteral {
  readonly editable: true;
  readonly file: string;
  /** Offsets of the literal itself, ready to splice. */
  readonly start: number;
  readonly end: number;
  /** The literal exactly as written, e.g. `2446` or `-12`. */
  readonly text: string;
  readonly location: SourceLocation;
  /**
   * True when the value came from a default handed to a frame-kit helper
   * rather than from the box set itself, so every set that omits it reads
   * this one literal.
   */
  readonly sharedDefault: boolean;
}

export interface UnresolvedValue {
  readonly editable: false;
  readonly reason: UnsupportedReason;
  /** A sentence naming the construct, for the inspector's lock tooltip. */
  readonly detail: string;
  /** Where the value really comes from, when that is known. */
  readonly source?: SourceLocation;
}

export type Resolution = ResolvedLiteral | UnresolvedValue;

export interface ResolveContext {
  readonly api: TypeScriptApi;
  readonly index: SourceIndex;
  /** Nothing outside this directory may be reported as editable. */
  readonly root: string;
}

/** Box sets `withCollectorInfoDefaults` fills a `collectorInfo` into. */
const COLLECTOR_BOX_SETS = new Set([
  "boxes",
  "tallBoxes",
  "backBoxes",
  "creatureBoxes",
  "backCreatureBoxes",
  "flipsidePtBoxes",
  "sagaFrontBoxes",
  "sagaFrontCreatureBoxes",
  "sagaBackBoxes",
  "sagaBackCreatureBoxes",
]);

const KIT_HELPERS = new Set([
  "withCollectorInfoDefaults",
  "withSettingsDefaults",
  "omit",
]);

/** Guards against an import cycle turning into a stack overflow. */
const MAX_DEPTH = 96;

/**
 * Names bound by an inlined function call, innermost first.
 *
 * Frames shape box sets with small local functions (`withTextlessOverrides`,
 * `buildCreatureBoxes`). Their parameters and `const`s are not declared at
 * file level, so an identifier inside one resolves here before the file is
 * consulted.
 */
interface Scope {
  readonly bindings: ReadonlyMap<string, Target>;
  readonly parent: Scope | undefined;
}

/**
 * A value mid-resolution.
 *
 * `expr` is an ordinary node. The other kinds stand in for an object that only
 * exists at runtime — what a frame-kit helper returns — whose members are
 * still traceable to a literal.
 */
type Target =
  | {
      readonly kind: "expr";
      readonly file: string;
      readonly node: ts.Node;
      readonly scope: Scope | undefined;
    }
  | {
      readonly kind: "helperConfig";
      readonly helper: "collectorInfo" | "settings";
      readonly config: Target;
      readonly defaults: Target;
    }
  | {
      readonly kind: "helperBoxSet";
      readonly base: Target;
      readonly defaults: Target;
    }
  | {
      readonly kind: "omitResult";
      readonly source: Target;
      readonly removed: ReadonlySet<string>;
    };

type Step =
  | { readonly ok: true; readonly target: Target; readonly shared?: boolean }
  | { readonly ok: false; readonly problem: UnresolvedValue };

const expr = (
  file: string,
  node: ts.Node,
  scope: Scope | undefined,
): Target => ({ kind: "expr", file, node, scope });

const fail = (
  reason: UnsupportedReason,
  detail: string,
  source?: SourceLocation,
): Step => ({
  ok: false,
  problem: source
    ? { editable: false, reason, detail, source }
    : { editable: false, reason, detail },
});

function lookup(scope: Scope | undefined, name: string): Target | undefined {
  for (let current = scope; current; current = current.parent) {
    const found = current.bindings.get(name);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function locationOf(
  api: TypeScriptApi,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): SourceLocation {
  const { line, character } = api.getLineAndCharacterOfPosition(
    sourceFile,
    node.getStart(sourceFile),
  );
  return {
    file: normalizeFile(sourceFile.fileName),
    line: line + 1,
    column: character + 1,
  };
}

function targetLocation(
  ctx: ResolveContext,
  target: Target,
): SourceLocation | undefined {
  switch (target.kind) {
    case "helperConfig":
      return targetLocation(ctx, target.config);
    case "helperBoxSet":
      return targetLocation(ctx, target.base);
    case "omitResult":
      return targetLocation(ctx, target.source);
    default: {
      const sourceFile = ctx.index.get(target.file);
      return sourceFile
        ? locationOf(ctx.api, sourceFile, target.node)
        : undefined;
    }
  }
}

/** Package that owns `file`, for identifying frame-kit's own helpers. */
const packageNames = new Map<string, string | undefined>();
function packageNameFor(file: string): string | undefined {
  let dir = path.dirname(file);
  for (;;) {
    if (packageNames.has(dir)) {
      return packageNames.get(dir);
    }
    try {
      const { name } = JSON.parse(
        readFileSync(path.join(dir, "package.json"), "utf8"),
      ) as { name?: string };
      packageNames.set(dir, name);
      return name;
    } catch {
      /* keep walking up */
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function propertyName(
  api: TypeScriptApi,
  name: ts.PropertyName,
): string | undefined {
  if (
    api.isIdentifier(name) ||
    api.isStringLiteral(name) ||
    api.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

/** Strips `as const`, `satisfies`, parentheses and `!`. */
function unwrapExpr(api: TypeScriptApi, node: ts.Node): ts.Node {
  let current = node;
  for (;;) {
    if (
      api.isParenthesizedExpression(current) ||
      api.isAsExpression(current) ||
      api.isSatisfiesExpression(current) ||
      api.isNonNullExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/**
 * The expression an exported name is bound to, following re-exports.
 *
 * `export * from` is deliberately not followed: it would mean scanning a whole
 * barrel chain to find which module declares the name, and no frame's own
 * value is reached that way.
 */
function exportTarget(
  ctx: ResolveContext,
  file: string,
  exportName: string,
  depth: number,
): Step {
  const sourceFile = ctx.index.get(file);
  if (!sourceFile) {
    return fail("unreadable", `Could not read ${file}.`);
  }
  const { api } = ctx;

  for (const statement of sourceFile.statements) {
    const isExported = api
      .getModifiers(statement as ts.HasModifiers)
      ?.some((modifier) => modifier.kind === api.SyntaxKind.ExportKeyword);

    if (api.isVariableStatement(statement) && isExported) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          api.isIdentifier(declaration.name) &&
          declaration.name.text === exportName &&
          declaration.initializer
        ) {
          return {
            ok: true,
            target: expr(file, declaration.initializer, undefined),
          };
        }
      }
    }

    if (
      api.isFunctionDeclaration(statement) &&
      isExported &&
      statement.name?.text === exportName
    ) {
      return { ok: true, target: expr(file, statement, undefined) };
    }

    if (api.isExportAssignment(statement) && exportName === "default") {
      return { ok: true, target: expr(file, statement.expression, undefined) };
    }

    // `export { a as b }` and `export { a } from "./x"`.
    if (
      api.isExportDeclaration(statement) &&
      statement.exportClause &&
      api.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (element.name.text !== exportName) {
          continue;
        }
        const local = element.propertyName?.text ?? element.name.text;
        if (
          statement.moduleSpecifier &&
          api.isStringLiteral(statement.moduleSpecifier)
        ) {
          const next = resolveModuleFile(statement.moduleSpecifier.text, file);
          return next
            ? exportTarget(ctx, next, local, depth + 1)
            : fail(
                "unsupported-expression",
                `Could not resolve "${statement.moduleSpecifier.text}" from ${path.basename(file)}.`,
              );
        }
        return resolveIdentifier(ctx, file, local, depth + 1, undefined);
      }
    }
  }

  return fail(
    "no-export",
    `${path.basename(file)} has no export named "${exportName}".`,
  );
}

/** What an identifier refers to: a scope binding, a file-level declaration, or an import. */
function resolveIdentifier(
  ctx: ResolveContext,
  file: string,
  name: string,
  depth: number,
  scope: Scope | undefined,
): Step {
  if (depth > MAX_DEPTH) {
    return fail(
      "unsupported-expression",
      `Gave up following "${name}" — the references may be cyclic.`,
    );
  }

  const bound = lookup(scope, name);
  if (bound) {
    return { ok: true, target: bound };
  }

  const sourceFile = ctx.index.get(file);
  if (!sourceFile) {
    return fail("unreadable", `Could not read ${file}.`);
  }
  const { api } = ctx;

  for (const statement of sourceFile.statements) {
    if (api.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          api.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer
        ) {
          return {
            ok: true,
            target: expr(file, declaration.initializer, undefined),
          };
        }
      }
    }

    if (api.isFunctionDeclaration(statement) && statement.name?.text === name) {
      return { ok: true, target: expr(file, statement, undefined) };
    }

    if (
      !api.isImportDeclaration(statement) ||
      !statement.importClause ||
      !api.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const { importClause } = statement;
    const specifier = statement.moduleSpecifier.text;
    const named = importClause.namedBindings;

    if (named && api.isNamespaceImport(named) && named.name.text === name) {
      return fail(
        "not-a-literal",
        `"${name}" is a whole module (\`import * as ${name}\`) — asset barrels are not editable values.`,
      );
    }
    if (named && api.isNamedImports(named)) {
      for (const element of named.elements) {
        if (element.name.text === name) {
          const original = element.propertyName?.text ?? element.name.text;
          const next = resolveModuleFile(specifier, file);
          return next
            ? exportTarget(ctx, next, original, depth + 1)
            : fail(
                "unsupported-expression",
                `Could not resolve "${specifier}" from ${path.basename(file)}.`,
              );
        }
      }
    }
    if (importClause.name?.text === name) {
      const next = resolveModuleFile(specifier, file);
      return next
        ? exportTarget(ctx, next, "default", depth + 1)
        : fail(
            "unsupported-expression",
            `Could not resolve "${specifier}" from ${path.basename(file)}.`,
          );
    }
  }

  return fail(
    "unsupported-expression",
    `Could not find where "${name}" is declared.`,
  );
}

/** The file an imported name comes from, without resolving what it binds to. */
function importSourceFor(
  ctx: ResolveContext,
  sourceFile: ts.SourceFile,
  name: string,
  importer: string,
): string | undefined {
  const { api } = ctx;
  for (const statement of sourceFile.statements) {
    if (
      !api.isImportDeclaration(statement) ||
      !statement.importClause ||
      !api.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }
    const named = statement.importClause.namedBindings;
    if (named && api.isNamedImports(named)) {
      for (const element of named.elements) {
        if (element.name.text === name) {
          return resolveModuleFile(statement.moduleSpecifier.text, importer);
        }
      }
    }
  }
  return undefined;
}

/** Which frame-kit authoring helper a call is, if any. Identity, not name. */
function kitHelper(
  ctx: ResolveContext,
  file: string,
  call: ts.CallExpression,
  scope: Scope | undefined,
  depth: number,
): "collectorInfo" | "settings" | "omit" | undefined {
  const { api } = ctx;
  if (!api.isIdentifier(call.expression)) {
    return undefined;
  }
  const name = call.expression.text;
  if (!KIT_HELPERS.has(name)) {
    return undefined;
  }
  const declaration = resolveIdentifier(ctx, file, name, depth + 1, scope);
  const declaredIn =
    declaration.ok && declaration.target.kind === "expr"
      ? declaration.target.file
      : undefined;
  const sourceFile = ctx.index.get(file);
  const importedFrom = sourceFile
    ? importSourceFor(ctx, sourceFile, name, file)
    : undefined;
  if (
    packageNameFor(declaredIn ?? importedFrom ?? file) !==
    "@cardanvil/frame-kit"
  ) {
    return undefined;
  }
  if (name === "omit") {
    return "omit";
  }
  return name === "withCollectorInfoDefaults" ? "collectorInfo" : "settings";
}

/** A callable's parameters and body, whether written as a declaration or an arrow. */
function callableOf(
  api: TypeScriptApi,
  node: ts.Node,
):
  | {
      parameters: readonly ts.ParameterDeclaration[];
      body: ts.Node | undefined;
    }
  | undefined {
  if (
    api.isFunctionDeclaration(node) ||
    api.isFunctionExpression(node) ||
    api.isArrowFunction(node)
  ) {
    return { parameters: node.parameters, body: node.body };
  }
  return undefined;
}

/**
 * Evaluates a call to a function written in the author's own source.
 *
 * Frames shape box sets with small pure helpers, so refusing every call would
 * make most of a frame like `frame-borderless` read-only. Only the shapes
 * those helpers actually use are understood: an expression-bodied arrow, or a
 * block whose statements are `const` bindings followed by a single `return`.
 * Anything else — a branch, a loop, a reassignment — falls through to the
 * `helper-call` refusal below, and the value-verification gate in
 * `applyEdits` is the backstop if this is ever wrong.
 */
function inlineCall(
  ctx: ResolveContext,
  target: { file: string; node: ts.CallExpression; scope: Scope | undefined },
  depth: number,
): Step | undefined {
  const { api } = ctx;
  const callee = deref(
    ctx,
    expr(target.file, target.node.expression, target.scope),
    depth + 1,
  );
  if (!callee.ok || callee.target.kind !== "expr") {
    return undefined;
  }
  const callable = callableOf(api, callee.target.node);
  if (!callable?.body) {
    return undefined;
  }

  const calleeFile = callee.target.file;
  const bindings = new Map<string, Target>();
  callable.parameters.forEach((parameter, i) => {
    if (!api.isIdentifier(parameter.name)) {
      return;
    }
    const argument = target.node.arguments[i];
    const bound = argument
      ? expr(target.file, argument, target.scope)
      : parameter.initializer
        ? expr(calleeFile, parameter.initializer, undefined)
        : undefined;
    if (bound) {
      bindings.set(parameter.name.text, bound);
    }
  });

  let scope: Scope = { bindings, parent: undefined };
  const { body } = callable;

  if (!api.isBlock(body)) {
    return deref(ctx, expr(calleeFile, body, scope), depth + 1);
  }

  for (const statement of body.statements) {
    if (api.isVariableStatement(statement)) {
      const locals = new Map<string, Target>();
      for (const declaration of statement.declarationList.declarations) {
        if (api.isIdentifier(declaration.name) && declaration.initializer) {
          locals.set(
            declaration.name.text,
            expr(calleeFile, declaration.initializer, scope),
          );
        }
      }
      scope = { bindings: locals, parent: scope };
      continue;
    }
    if (api.isReturnStatement(statement)) {
      return statement.expression
        ? deref(ctx, expr(calleeFile, statement.expression, scope), depth + 1)
        : undefined;
    }
    return undefined; // a branch, a loop, something with control flow
  }
  return undefined;
}

/**
 * Reduces a target to the thing it actually is: follows identifiers, property
 * accesses and re-exports, recognises frame-kit's helpers, and inlines calls
 * to the author's own shaping functions.
 */
function deref(ctx: ResolveContext, target: Target, depth: number): Step {
  if (depth > MAX_DEPTH) {
    return fail(
      "unsupported-expression",
      "Gave up resolving — the references may be cyclic.",
    );
  }
  if (target.kind !== "expr") {
    return { ok: true, target };
  }
  const { api } = ctx;
  const node = unwrapExpr(api, target.node);
  const { file, scope } = target;

  if (api.isIdentifier(node)) {
    const next = resolveIdentifier(ctx, file, node.text, depth + 1, scope);
    return next.ok ? deref(ctx, next.target, depth + 1) : next;
  }

  if (
    api.isPropertyAccessExpression(node) ||
    api.isElementAccessExpression(node)
  ) {
    const key = api.isPropertyAccessExpression(node)
      ? node.name.text
      : api.isStringLiteral(node.argumentExpression) ||
          api.isNumericLiteral(node.argumentExpression)
        ? node.argumentExpression.text
        : undefined;
    if (key === undefined) {
      return fail("computed", "This value is read with a computed key.");
    }
    const object = deref(ctx, expr(file, node.expression, scope), depth + 1);
    if (!object.ok) {
      return object;
    }
    const inner = descend(ctx, object.target, key, depth + 1);
    return inner.ok ? deref(ctx, inner.target, depth + 1) : inner;
  }

  if (api.isCallExpression(node)) {
    const helper = kitHelper(ctx, file, node, scope, depth);
    const [first, second] = node.arguments;

    if (helper === "omit" && first && second) {
      const list = unwrapExpr(api, second);
      if (api.isArrayLiteralExpression(list)) {
        const removed = new Set<string>();
        for (const element of list.elements) {
          const key = unwrapExpr(api, element);
          if (
            api.isStringLiteral(key) ||
            api.isNoSubstitutionTemplateLiteral(key)
          ) {
            removed.add(key.text);
          }
        }
        return {
          ok: true,
          target: {
            kind: "omitResult",
            source: expr(file, first, scope),
            removed,
          },
        };
      }
    }

    if (helper && helper !== "omit" && first && second) {
      return {
        ok: true,
        target: {
          kind: "helperConfig",
          helper,
          config: expr(file, first, scope),
          defaults: expr(file, second, scope),
        },
      };
    }

    const inlined = inlineCall(ctx, { file, node, scope }, depth);
    if (inlined) {
      return inlined;
    }

    const name = api.isIdentifier(node.expression)
      ? node.expression.text
      : api.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : "a function";
    const sourceFile = ctx.index.get(file);
    return fail(
      "helper-call",
      `This value is produced by \`${name}(…)\`, which the studio cannot follow.`,
      sourceFile ? locationOf(api, sourceFile, node) : undefined,
    );
  }

  const isNegativeNumber =
    api.isPrefixUnaryExpression(node) &&
    node.operator === api.SyntaxKind.MinusToken &&
    api.isNumericLiteral(node.operand);

  if (
    api.isConditionalExpression(node) ||
    api.isBinaryExpression(node) ||
    api.isTemplateExpression(node) ||
    (api.isPrefixUnaryExpression(node) && !isNegativeNumber)
  ) {
    const sourceFile = ctx.index.get(file);
    return fail(
      "computed",
      "This value is computed from other values; edit it in the source.",
      sourceFile ? locationOf(api, sourceFile, node) : undefined,
    );
  }

  return { ok: true, target: expr(file, node, scope) };
}

/** One path segment: the value of `key` inside `target`. */
function descend(
  ctx: ResolveContext,
  target: Target,
  key: string,
  depth: number,
): Step {
  if (depth > MAX_DEPTH) {
    return fail(
      "unsupported-expression",
      "Gave up resolving — the structure may be cyclic.",
    );
  }
  const resolved = deref(ctx, target, depth);
  if (!resolved.ok) {
    return resolved;
  }
  const current = resolved.target;
  const { api } = ctx;

  if (current.kind === "helperConfig") {
    if (current.helper === "collectorInfo" && COLLECTOR_BOX_SETS.has(key)) {
      const base = descend(ctx, current.config, key, depth + 1);
      if (!base.ok) {
        return base; // the box set itself is absent; the helper leaves it so
      }
      return {
        ok: true,
        target: {
          kind: "helperBoxSet",
          base: base.target,
          defaults: current.defaults,
        },
      };
    }
    if (current.helper === "settings" && key === "templateSettings") {
      return fail(
        "computed",
        "`templateSettings` here merges the layout's own settings with the defaults.",
        targetLocation(ctx, current.defaults),
      );
    }
    return descend(ctx, current.config, key, depth + 1);
  }

  if (current.kind === "omitResult") {
    if (current.removed.has(key)) {
      return fail(
        "missing-property",
        `"${key}" is removed here by \`omit(…)\`.`,
        targetLocation(ctx, current.source),
      );
    }
    return descend(ctx, current.source, key, depth + 1);
  }

  if (current.kind === "helperBoxSet") {
    const own = descend(ctx, current.base, key, depth + 1);
    if (own.ok || key !== "collectorInfo") {
      return own;
    }
    // The box set has no collectorInfo of its own, so the helper's default is
    // the value — and every box set that omits it reads the same literal.
    return { ok: true, target: current.defaults, shared: true };
  }

  const node = unwrapExpr(api, current.node);
  if (!api.isObjectLiteralExpression(node)) {
    const sourceFile = ctx.index.get(current.file);
    return fail(
      "not-a-literal",
      `Expected an object to read "${key}" from, but found ${api.SyntaxKind[node.kind]}.`,
      sourceFile ? locationOf(api, sourceFile, node) : undefined,
    );
  }

  // Source order decides: a later spread overrides an earlier own property,
  // and an own property overrides an earlier spread.
  let winner: Step | undefined;
  for (const property of node.properties) {
    if (
      api.isPropertyAssignment(property) &&
      propertyName(api, property.name) === key
    ) {
      winner = {
        ok: true,
        target: expr(current.file, property.initializer, current.scope),
      };
    } else if (
      api.isShorthandPropertyAssignment(property) &&
      property.name.text === key
    ) {
      winner = {
        ok: true,
        target: expr(current.file, property.name, current.scope),
      };
    } else if (api.isSpreadAssignment(property)) {
      const inner = descend(
        ctx,
        expr(current.file, property.expression, current.scope),
        key,
        depth + 1,
      );
      if (inner.ok) {
        winner = inner;
      }
    }
  }

  if (!winner) {
    const sourceFile = ctx.index.get(current.file);
    return fail(
      "missing-property",
      `"${key}" is not written here.`,
      sourceFile ? locationOf(api, sourceFile, node) : undefined,
    );
  }
  return winner;
}

/**
 * Where the value at `framePath` is written in source, if it is written as a
 * literal at all.
 *
 * Returns the exact text range so a caller can splice a new value in without
 * reprinting anything — comments, formatting and import order survive because
 * nothing else is touched.
 */
export function resolveFramePath(
  ctx: ResolveContext,
  entryFile: string,
  exportName: string,
  framePath: FramePath,
): Resolution {
  let step = exportTarget(ctx, normalizeFile(entryFile), exportName, 0);
  let shared = false;

  for (const segment of framePath) {
    if (!step.ok) {
      return step.problem;
    }
    step = descend(ctx, step.target, String(segment), 0);
    shared ||= step.ok && step.shared === true;
  }
  if (!step.ok) {
    return step.problem;
  }

  const final = deref(ctx, step.target, 0);
  if (!final.ok) {
    return final.problem;
  }
  if (final.target.kind !== "expr") {
    return {
      editable: false,
      reason: "not-a-literal",
      detail: `${formatPath(framePath)} resolves to a value a helper builds, not a literal.`,
    };
  }

  const { api } = ctx;
  const sourceFile = ctx.index.get(final.target.file);
  if (!sourceFile) {
    return {
      editable: false,
      reason: "unreadable",
      detail: `Could not read ${final.target.file}.`,
    };
  }

  const node = unwrapExpr(api, final.target.node);
  const isNegativeNumber =
    api.isPrefixUnaryExpression(node) &&
    node.operator === api.SyntaxKind.MinusToken &&
    api.isNumericLiteral(node.operand);
  const isLiteral =
    api.isNumericLiteral(node) ||
    api.isStringLiteral(node) ||
    api.isNoSubstitutionTemplateLiteral(node) ||
    node.kind === api.SyntaxKind.TrueKeyword ||
    node.kind === api.SyntaxKind.FalseKeyword ||
    isNegativeNumber;

  const location = locationOf(api, sourceFile, node);

  if (!isLiteral) {
    return {
      editable: false,
      reason: "not-a-literal",
      detail: `${formatPath(framePath)} is written as ${api.SyntaxKind[node.kind]}, not a literal.`,
      source: location,
    };
  }

  if (!isUnderRoot(final.target.file, ctx.root)) {
    return {
      editable: false,
      reason: "outside-root",
      detail: `This value lives in ${path.basename(final.target.file)}, outside the project the studio was pointed at.`,
      source: location,
    };
  }

  const start = node.getStart(sourceFile);
  const end = node.getEnd();
  return {
    editable: true,
    file: normalizeFile(final.target.file),
    start,
    end,
    text: sourceFile.text.slice(start, end),
    location,
    sharedDefault: shared,
  };
}
