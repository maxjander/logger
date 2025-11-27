import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";
import packageJson from "../../package.json";

const rootDir = resolve(__dirname, "../..");

describe("package.json", () => {
  describe("exports", () => {
    it("should have valid main entry point", () => {
      const mainPath = resolve(rootDir, packageJson.main);
      expect(existsSync(mainPath)).toBe(true);
    });

    it("should have valid module entry point", () => {
      const modulePath = resolve(rootDir, packageJson.module);
      expect(existsSync(modulePath)).toBe(true);
    });

    it("should have valid types entry point", () => {
      const typesPath = resolve(rootDir, packageJson.types);
      expect(existsSync(typesPath)).toBe(true);
    });

    it("should have valid exports.import path", () => {
      const importPath = resolve(rootDir, packageJson.exports["."].import);
      expect(existsSync(importPath)).toBe(true);
    });

    it("should have valid exports.require path", () => {
      const requirePath = resolve(rootDir, packageJson.exports["."].require);
      expect(existsSync(requirePath)).toBe(true);
    });

    it("should have valid exports.types path", () => {
      const typesPath = resolve(rootDir, packageJson.exports["."].types);
      expect(existsSync(typesPath)).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should have a name", () => {
      expect(packageJson.name).toBe("@maxjan/logger");
    });

    it("should have a version", () => {
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("should have a repository url", () => {
      expect(packageJson.repository.url).toContain("github.com/maxjander/logger");
    });

    it("should have node engine requirement", () => {
      expect(packageJson.engines.node).toBeDefined();
    });
  });
});
