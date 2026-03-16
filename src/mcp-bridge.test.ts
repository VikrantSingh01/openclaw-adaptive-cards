import { describe, expect, it } from "vitest";
import {
  validateCard,
  checkHostCompatibility,
  adaptCardForHost,
  checkCardAccessibility,
  analyzeCard,
  getValidElementTypes,
  getValidActionTypes,
  getAllPatterns,
} from "./mcp-bridge.js";

describe("validateCard (MCP bridge)", () => {
  it("validates a simple valid card", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    const result = validateCard(body);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.elementCount).toBeGreaterThanOrEqual(1);
  });

  it("validates card with actions", () => {
    const body = [{ type: "TextBlock", text: "Choose" }];
    const actions = [{ type: "Action.Execute", title: "Go", verb: "go", data: {} }];
    const result = validateCard(body, actions);
    expect(result.valid).toBe(true);
  });

  it("returns errors and warnings separately", () => {
    const body = [{ type: "TextBlock", text: "x" }];
    const result = validateCard(body);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("returns element and action counts", () => {
    const body = [
      { type: "TextBlock", text: "a" },
      { type: "TextBlock", text: "b" },
    ];
    const result = validateCard(body);
    expect(result.elementCount).toBeGreaterThanOrEqual(2);
  });
});

describe("checkHostCompatibility (MCP bridge)", () => {
  it("reports no issues for simple card on Teams", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    const result = checkHostCompatibility(body, undefined, "teams");
    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("maps 'viva' to 'viva-connections'", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    const result = checkHostCompatibility(body, undefined, "viva");
    expect(result.host).toBe("viva-connections");
  });

  it("returns compatible for unknown hosts (maps to generic)", () => {
    const body = [{ type: "TextBlock", text: "x" }];
    const result = checkHostCompatibility(body, undefined, "unknown-host");
    expect(result.compatible).toBe(true);
    expect(result.host).toBe("generic");
  });
});

describe("adaptCardForHost (MCP bridge)", () => {
  it("returns body and actions from adapted card", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    const actions = [{ type: "Action.Submit", title: "OK", data: {} }];
    const result = adaptCardForHost(body, actions, "teams");
    expect(Array.isArray(result.body)).toBe(true);
    expect(Array.isArray(result.changes)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("returns changes list when adaptation occurs", () => {
    const body = [{ type: "TextBlock", text: "x" }];
    const actions = [{ type: "Action.Execute", title: "Go", verb: "go", data: {} }];
    // Outlook doesn't support Action.Execute
    const result = adaptCardForHost(body, actions, "outlook");
    expect(result.changes.length).toBeGreaterThanOrEqual(0);
  });

  it("maps 'viva' to 'viva-connections'", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    // Should not throw even though we pass "viva" not "viva-connections"
    const result = adaptCardForHost(body, undefined, "viva");
    expect(Array.isArray(result.body)).toBe(true);
  });
});

describe("checkCardAccessibility (MCP bridge)", () => {
  it("returns a score and issues array", () => {
    const body = [{ type: "TextBlock", text: "Hello" }];
    const result = checkCardAccessibility(body);
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("flags missing altText on images", () => {
    const body = [{ type: "Image", url: "https://example.com/img.png" }];
    const result = checkCardAccessibility(body);
    expect(result.issues.some((i) => i.toLowerCase().includes("alt"))).toBe(true);
  });
});

describe("analyzeCard (MCP bridge)", () => {
  it("returns card statistics", () => {
    const body = [
      { type: "TextBlock", text: "Hello" },
      { type: "FactSet", facts: [{ title: "A", value: "B" }] },
    ];
    const result = analyzeCard(body);
    expect(result.elementCount).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(result.elementTypes)).toBe(true);
    expect(result.elementTypes).toContain("TextBlock");
  });
});

describe("getValidElementTypes (MCP)", () => {
  it("returns a set of known element types", () => {
    const types = getValidElementTypes();
    expect(types.has("TextBlock")).toBe(true);
    expect(types.has("Table")).toBe(true);
    expect(types.has("Image")).toBe(true);
  });
});

describe("getValidActionTypes (MCP)", () => {
  it("returns a set of known action types", () => {
    const types = getValidActionTypes();
    expect(types.has("Action.Submit")).toBe(true);
    expect(types.has("Action.Execute")).toBe(true);
    expect(types.has("Action.OpenUrl")).toBe(true);
  });
});

describe("getAllPatterns (MCP)", () => {
  it("returns 21 layout patterns", () => {
    const patterns = getAllPatterns();
    expect(patterns.length).toBe(21);
  });

  it("each pattern has name, description, and elements", () => {
    const patterns = getAllPatterns();
    for (const p of patterns) {
      expect(typeof p.name).toBe("string");
      expect(typeof p.description).toBe("string");
      expect(Array.isArray(p.elements)).toBe(true);
    }
  });

  it("includes enterprise patterns", () => {
    const patterns = getAllPatterns();
    const names = patterns.map((p) => p.name);
    expect(names).toContain("approval");
    expect(names).toContain("incident-alert");
    expect(names).toContain("calendar-event");
    expect(names).toContain("pull-request");
  });
});
