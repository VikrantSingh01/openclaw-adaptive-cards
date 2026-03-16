import { describe, expect, it } from "vitest";
import { buildCardPromptGuidance } from "./prompt.js";

describe("buildCardPromptGuidance", () => {
  it("includes native guidance for native capability", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("natively");
    expect(guidance).toContain("Prefer cards over plain text");
    expect(guidance).toContain("When to use cards");
    expect(guidance).toContain("When NOT to use cards");
    expect(guidance).toContain("Available card patterns");
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

  it("always includes card patterns for all capabilities", () => {
    for (const cap of ["native", "translated", "fallback"] as const) {
      const guidance = buildCardPromptGuidance(cap);
      expect(guidance).toContain("Available card patterns");
    }
  });

  it("starts with ## Adaptive Cards heading", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance.startsWith("## Adaptive Cards")).toBe(true);
  });

  it("references v1.6 schema", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("v1.6");
  });

  it("includes Action.Execute in actions section", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("Action.Execute");
    expect(guidance).toContain("Action.ToggleVisibility");
  });

  it("includes v1.6 elements", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("CodeBlock");
    expect(guidance).toContain("Carousel");
    expect(guidance).toContain("Chart.Bar");
    expect(guidance).toContain("Rating");
  });

  it("includes dynamic patterns from MCP library", () => {
    const guidance = buildCardPromptGuidance("native");
    // These come from getAllPatterns() in the MCP library
    expect(guidance).toContain("approval");
    expect(guidance).toContain("notification");
    expect(guidance).toContain("dashboard");
  });

  it("mentions validation and accessibility in preamble", () => {
    const guidance = buildCardPromptGuidance("native");
    expect(guidance).toContain("validated");
    expect(guidance).toContain("accessibility");
  });
});
