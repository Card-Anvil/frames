import { describe, expect, it } from "vitest";

import { Reporter, formatProblem } from "./report.js";

describe("Reporter", () => {
  it("separates errors from warnings and only errors fail a run", () => {
    const reporter = new Reporter();
    reporter.warn({ frame: "a", message: "worth knowing" });
    expect(reporter.ok).toBe(true);
    reporter.error({ frame: "b", message: "broken" });
    expect(reporter.ok).toBe(false);
    expect(reporter.errors).toHaveLength(1);
    expect(reporter.warnings).toHaveLength(1);
  });

  it("renders where a problem is before what it is", () => {
    expect(
      formatProblem({
        severity: "error",
        frame: "parchment",
        path: "config.layouts.normal",
        message: "nope",
      }),
    ).toBe("parchment › config.layouts.normal — nope");
    expect(formatProblem({ severity: "error", message: "nope" })).toBe("nope");
  });

  describe("GitHub annotations", () => {
    it("carries the file and frame so the annotation lands on the diff", () => {
      const reporter = new Reporter();
      reporter.error({ frame: "a", file: "frames/a/index.ts", message: "bad" });
      expect(reporter.toAnnotations()).toBe(
        "::error file=frames/a/index.ts,title=a::a — bad",
      );
    });

    // A newline terminates a workflow command, so an unescaped one would
    // truncate the annotation and swallow the rest of the message.
    it("escapes newlines", () => {
      const reporter = new Reporter();
      reporter.error({ message: "line one\nline two" });
      expect(reporter.toAnnotations()).toBe("::error ::line one%0Aline two");
    });
  });

  describe("Markdown summary", () => {
    it("is empty when there is nothing to say", () => {
      expect(new Reporter().toMarkdown()).toBe("");
    });

    // A raw pipe would break the table it is rendered into.
    it("escapes pipes and flattens newlines", () => {
      const reporter = new Reporter();
      reporter.error({ message: "a | b\nc" });
      const row = reporter.toMarkdown().split("\n").at(-1);
      expect(row).toBe(String.raw`| error |  |  | a \| b c |`);
    });
  });
});
