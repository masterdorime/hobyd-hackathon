import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CODE_ROOTS = ["app", "components", "hooks", "lib"];
const MESSAGE_FILES = ["messages/id.json", "messages/en.json"];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? walk(path)
      : /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const sourceFiles = CODE_ROOTS.flatMap((root) => walk(join(ROOT, root)));
const allFiles = [...sourceFiles, ...MESSAGE_FILES.map((file) => join(ROOT, file))];

describe("release safety", () => {
  it("contains no fixture imports, preview shell labels, or starter residue", () => {
    const forbidden = [/UI PREVIEW/i, /from\s+["'][^"']*demo-data["']/, /Create Next App/i];
    const violations = allFiles.flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return forbidden
        .filter((pattern) => pattern.test(content))
        .map((pattern) => `${relative(ROOT, file)} matched ${pattern}`);
    });

    expect(violations).toEqual([]);
  });

  it("contains no direct Supabase table mutations in client components", () => {
    const violations = sourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8");
      return content.startsWith('"use client";') || content.startsWith("'use client';")
        ? /\.from\([^)]*\)[\s\S]{0,240}\.(insert|update|delete|upsert)\(/.test(content)
        : false;
    });

    expect(violations.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it("never exposes a secret Supabase key through a public environment name", () => {
    const violations = sourceFiles.filter((file) =>
      /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE)/.test(readFileSync(file, "utf8")),
    );

    expect(violations.map((file) => relative(ROOT, file))).toEqual([]);
  });
});
