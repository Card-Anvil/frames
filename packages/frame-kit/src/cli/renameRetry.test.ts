import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Windows refuses a rename onto a path another process holds open, which is
 * the ordinary case for a linked folder: something is reading the bundle this
 * rebuild is replacing. These drive that failure directly, since it cannot be
 * produced on the platform CI runs on.
 */
const rename = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return { ...real, default: real, rename };
});

const { writeFileAtomic } = await import("./atomic.js");
const { readFile } = await import("node:fs/promises");

/** The error Windows raises while a file is held open. */
function heldOpen(code: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(
    `${code}: operation not permitted, rename`,
  );
  error.code = code;
  return error;
}

let dir: string;
let realRename: typeof import("node:fs/promises").rename;

beforeEach(async () => {
  const real =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  realRename = real.rename;
  rename.mockImplementation(realRename);
  dir = await mkdtemp(path.join(tmpdir(), "frame-kit-rename-"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("writing over a file something else has open", () => {
  it("waits and succeeds once the file is released", async () => {
    let attempts = 0;
    rename.mockImplementation(async (from: string, to: string) => {
      attempts += 1;
      if (attempts < 3) {
        throw heldOpen("EPERM");
      }
      return realRename(from, to);
    });

    const file = path.join(dir, "frame.cardframe");
    await writeFileAtomic(file, "content");

    expect(attempts).toBe(3);
    expect(await readFile(file, "utf8")).toBe("content");
  });

  it.each(["EPERM", "EACCES", "EBUSY"])("waits out %s", async (code) => {
    let attempts = 0;
    rename.mockImplementation(async (from: string, to: string) => {
      attempts += 1;
      if (attempts < 2) {
        throw heldOpen(code);
      }
      return realRename(from, to);
    });

    await writeFileAtomic(path.join(dir, `${code}.cardframe`), "content");
    expect(attempts).toBe(2);
  });

  it("gives up rather than retrying forever, and leaves no temp file", async () => {
    rename.mockImplementation(() => {
      throw heldOpen("EPERM");
    });

    const file = path.join(dir, "stuck.cardframe");
    await expect(writeFileAtomic(file, "content")).rejects.toThrow(/EPERM/);

    const { readdir } =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    expect(await readdir(dir)).toEqual([]);
  });

  it("does not retry a failure that waiting cannot fix", async () => {
    let attempts = 0;
    rename.mockImplementation(() => {
      attempts += 1;
      throw heldOpen("ENOSPC");
    });

    await expect(
      writeFileAtomic(path.join(dir, "full.cardframe"), "content"),
    ).rejects.toThrow(/ENOSPC/);
    expect(attempts).toBe(1);
  });
});
