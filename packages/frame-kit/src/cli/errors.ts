/**
 * A problem the author can act on: a missing file, an unpackageable asset, a
 * malformed descriptor. Distinct from a programming error so the CLI can print
 * it plainly instead of dumping a stack.
 */
export class PackagingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackagingError";
  }
}
