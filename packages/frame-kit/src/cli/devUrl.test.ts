import path from "node:path";
import { describe, expect, it } from "vitest";

import { devUrlToFile } from "./devUrl.js";

const root = path.resolve("/project");

describe("devUrlToFile", () => {
  it("maps an asset under the root back to its file", () => {
    expect(devUrlToFile("/frames/x/w.png", root, "/")).toBe(
      path.resolve(root, "frames/x/w.png"),
    );
  });

  it("honours a non-root base", () => {
    expect(devUrlToFile("/app/frames/x/w.png", root, "/app/")).toBe(
      path.resolve(root, "frames/x/w.png"),
    );
  });

  // Vite builds the dev URL from the raw module id, so `?url` / `?inline`
  // suffixes ride along and would otherwise become part of the filename.
  it("strips an import query", () => {
    expect(devUrlToFile("/frames/x/w.png?url", root, "/")).toBe(
      path.resolve(root, "frames/x/w.png"),
    );
  });

  it("decodes percent-escapes", () => {
    expect(devUrlToFile("/frames/x/new%20a.png", root, "/")).toBe(
      path.resolve(root, "frames/x/new a.png"),
    );
  });

  describe("/@fs/ paths, for assets outside the root", () => {
    // `path.posix.join("/@fs/", id)` collapses the double slash, so a POSIX
    // path arrives having lost its leading slash and a Windows path arrives
    // still carrying its drive letter. Both must resolve to an absolute path.
    it("restores a POSIX absolute path", () => {
      expect(devUrlToFile("/@fs/home/jane/w.png", root, "/")).toBe(
        path.resolve("/home/jane/w.png"),
      );
    });

    it("keeps a Windows drive letter intact", () => {
      expect(devUrlToFile("/@fs/C:/Users/jane/w.png", root, "/")).toBe(
        path.resolve("C:/Users/jane/w.png"),
      );
    });
  });

  describe("assets that cannot be packaged", () => {
    it("rejects a data URL and says how to fix it", () => {
      expect(() =>
        devUrlToFile("data:image/svg+xml;base64,AAA=", root, "/"),
      ).toThrow(/inline/);
    });

    it("rejects a remote URL", () => {
      expect(() =>
        devUrlToFile("https://example.com/w.png", root, "/"),
      ).toThrow(/ship its own art/);
    });

    it("rejects a URL outside the dev base", () => {
      expect(() => devUrlToFile("/frames/w.png", root, "/app/")).toThrow(
        /not under the dev base/,
      );
    });
  });
});
