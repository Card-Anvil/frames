export type Severity = "error" | "warning";

/**
 * One thing wrong with one frame.
 *
 * Problems are collected rather than thrown so a single run tells an author
 * everything that needs fixing, not just whatever failed first.
 */
export interface Problem {
  severity: Severity;
  /** Frame slug, when the problem belongs to a particular frame. */
  frame?: string;
  /** Path relative to the run root, POSIX separators. */
  file?: string;
  /** Property path inside the frame, e.g. `config.layouts.normal.boxes.art`. */
  path?: string;
  message: string;
}

/** Renders a problem as one line: `frame › path — message`. */
export function formatProblem(problem: Problem): string {
  const where = [problem.frame, problem.path].filter(Boolean).join(" › ");
  return where ? `${where} — ${problem.message}` : problem.message;
}

/**
 * GitHub Actions workflow-command form, which turns a problem into an inline
 * annotation on the pull request diff. Emitting these from here is why neither
 * CI workflow needs a reporting step of its own.
 */
function toAnnotation(problem: Problem): string {
  const parts = [
    problem.file ? `file=${problem.file}` : undefined,
    problem.frame ? `title=${problem.frame}` : undefined,
  ].filter((part): part is string => part !== undefined);
  const head = `::${problem.severity} ${parts.join(",")}`;
  // Newlines terminate a workflow command, so they have to be escaped.
  const body = formatProblem(problem).replace(/\r?\n/g, "%0A");
  return `${head}::${body}`;
}

export class Reporter {
  readonly problems: Problem[] = [];

  add(problem: Problem): void {
    this.problems.push(problem);
  }

  error(problem: Omit<Problem, "severity">): void {
    this.add({ ...problem, severity: "error" });
  }

  warn(problem: Omit<Problem, "severity">): void {
    this.add({ ...problem, severity: "warning" });
  }

  get errors(): Problem[] {
    return this.problems.filter((problem) => problem.severity === "error");
  }

  get warnings(): Problem[] {
    return this.problems.filter((problem) => problem.severity === "warning");
  }

  get ok(): boolean {
    return this.errors.length === 0;
  }

  /** Human-readable lines for a terminal. */
  toText(): string {
    return this.problems
      .map((problem) => `${problem.severity}: ${formatProblem(problem)}`)
      .join("\n");
  }

  /** Workflow commands, one per problem. Empty outside GitHub Actions. */
  toAnnotations(): string {
    return this.problems.map(toAnnotation).join("\n");
  }

  toMarkdown(): string {
    if (this.problems.length === 0) {
      return "";
    }
    const rows = this.problems.map((problem) => {
      const cells = [
        problem.severity,
        problem.frame ?? "",
        problem.path ?? problem.file ?? "",
        problem.message.replace(/\r?\n/g, " ").replaceAll("|", String.raw`\|`),
      ];
      return `| ${cells.join(" | ")} |`;
    });
    return [
      "| | Frame | Where | Problem |",
      "| --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
  }
}

/** True when running inside GitHub Actions, where annotations are understood. */
export function inGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === "true";
}
