import { describe, expect, it } from "vitest";
import {
  extractPathFromShellError,
  grantSuppressionKey,
  resolveGrantDeniedPath,
} from "./grant-path";

describe("resolveGrantDeniedPath", () => {
  it("keeps a normal absolute path", () => {
    expect(resolveGrantDeniedPath("/data/x", "")).toBe("/data/x");
  });

  it("extracts a single path from a multi-line find error blob", () => {
    const blob = [
      "Exit code 1 == BusinessBillReminderLetterExportVO find:",
      "./.codex_tmp/temp/pip-build-tracker-y5fck8oq: Permission denied",
      "./.codex_tmp/temp/pip-ephem-wheel-cache-xtyrd9zf: Permission denied",
    ].join("\n");
    expect(resolveGrantDeniedPath(blob, "")).toBe("./.codex_tmp/temp/pip-build-tracker-y5fck8oq");
  });

  it("falls back to message text when path is empty", () => {
    expect(
      resolveGrantDeniedPath(
        null,
        "find: './.codex_tmp/temp/pip-install-ffdw77im': Permission denied",
      ),
    ).toBe("./.codex_tmp/temp/pip-install-ffdw77im");
  });
});

describe("extractPathFromShellError", () => {
  it("parses quoted find targets", () => {
    expect(
      extractPathFromShellError(
        "find: './.codex_tmp/temp/pip-target-42ab3ruk': Permission denied",
      ),
    ).toBe("./.codex_tmp/temp/pip-target-42ab3ruk");
  });
});

describe("grantSuppressionKey", () => {
  it("uses resolved path for suppression", () => {
    const blob = "find: ./foo: Permission denied\nfind: ./bar: Permission denied";
    expect(grantSuppressionKey(blob, "")).toBe("path:./foo");
  });
});
