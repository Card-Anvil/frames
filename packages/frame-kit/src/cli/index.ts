/**
 * Packaging: turning authored frames into distributable bundles.
 *
 * Separate from the main entry point because it needs Node and Vite, neither of
 * which a browser or Card Anvil's bundle has. Importing this pulls in the
 * packaging machinery; importing `@cardanvil/frame-kit` does not.
 */
export {
  type LoadOptions,
  type LoadedFrame,
  type ValidateResult,
  loadFrames,
  validateFrames,
} from "./api.js";
export {
  type BuildOptions,
  type BuildResult,
  type BuiltFrame,
  buildFrames,
} from "./build.js";
export { describeBytes } from "./bundle.js";
export {
  type DiscoveredFrame,
  discoverFrames,
  relativePosix,
} from "./discover.js";
export { devUrlToFile } from "./devUrl.js";
export { PackagingError } from "./errors.js";
export {
  FRAME_INDEX_FILENAME,
  FRAME_INDEX_FORMAT_VERSION,
  type FrameIndex,
  FrameIndexSchema,
  type IndexedFrame,
  IndexedFrameSchema,
  type ReleaseSource,
  buildIndex,
  downloadBase,
  latestIndexUrl,
} from "./frameIndex.js";
export {
  type FrameServer,
  loadFrameExport,
  startFrameServer,
} from "./loadFrame.js";
export {
  type Problem,
  Reporter,
  type Severity,
  formatProblem,
  inGitHubActions,
} from "./report.js";
export {
  SCHEMA_NAMES,
  SHIPPED_SCHEMAS,
  type SchemaName,
  schemaFilename,
  toJsonSchema,
} from "./schema.js";
export { stableStringify } from "./stableJson.js";
