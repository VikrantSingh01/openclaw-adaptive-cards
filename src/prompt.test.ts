import { describe, expect, it } from "vitest";
import { buildCardPromptGuidance } from "./prompt.js";

describe("buildCardPromptGuidance", () => {
  it("includes native guidance for native capability", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("natively");
    expect(guidance).toContain("Prefer cards over plain text");
    expect(guidance).toContain("When to use cards");
    expect(guidance).toContain("When NOT to use cards");
    expect(guidance).toContain("Common card patterns");
  });

  it("includes translation guidance for translated capability", () => {
    const guidance = buildCardPromptGuidance("translated");
    expect(guidance).toContain("translates");
    expect(guidance).toContain("Keep cards simple");
    expect(guidance).toContain("When to use cards");
  });

  it("includes fallback guidance for unsupported channels", () => {
    const guidance = buildCardPromptGuidance("fallback");
    expect(guidance).toContain("not");
    expect(guidance).toContain("prefer plain text");
    expect(guidance).toContain("When to use cards");
  });

  it("always includes common card patterns", () => {
    for (const cap of ["native", "translated", "fallback"] as const) {
      const guidance = buildCardPromptGuidance(cap);
      expect(guidance).toContain("Status card");
      expect(guidance).toContain("Choice picker");
      expect(guidance).toContain("Data table");
      expect(guidance).toContain("Progress tracker");
    }
  });

  it("starts with ## Adaptive Cards heading", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance.startsWith("## Adaptive Cards")).toBe(true);
  });
});
