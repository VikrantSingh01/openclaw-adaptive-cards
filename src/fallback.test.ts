import { describe, expect, it } from "vitest";
import { generateFallbackText } from "./fallback.js";

describe("generateFallbackText", () => {
  it("extracts text from TextBlock", () => {
    const body = [{ type: "TextBlock", text: "Hello World" }];
    expect(generateFallbackText(body)).toBe("Hello World");
  });

  it("extracts text from RichTextBlock inlines", () => {
    const body = [
      {
        type: "RichTextBlock",
        inlines: [{ text: "Bold " }, "plain ", { text: "more" }],
      },
    ];
    expect(generateFallbackText(body)).toBe("Bold plain more");
  });

  it("formats FactSet as title: value lines", () => {
    const body = [
      {
        type: "FactSet",
        facts: [
          { title: "Status", value: "Active" },
          { title: "Region", value: "US" },
        ],
      },
    ];
    expect(generateFallbackText(body)).toBe("Status: Active\nRegion: US");
  });

  it("recurses into ColumnSet columns", () => {
    const body = [
      {
        type: "ColumnSet",
        columns: [
          { items: [{ type: "TextBlock", text: "Col 1" }] },
          { items: [{ type: "TextBlock", text: "Col 2" }] },
        ],
      },
    ];
    expect(generateFallbackText(body)).toBe("Col 1\nCol 2");
  });

  it("recurses into Container items", () => {
    const body = [
      {
        type: "Container",
        items: [
          { type: "TextBlock", text: "Inside" },
          { type: "TextBlock", text: "Container" },
        ],
      },
    ];
    expect(generateFallbackText(body)).toBe("Inside\nContainer");
  });

  it("extracts Image altText", () => {
    const body = [{ type: "Image", altText: "Company Logo" }];
    expect(generateFallbackText(body)).toBe("[Image: Company Logo]");
  });

  it("skips Image without altText", () => {
    const body = [{ type: "Image", url: "https://example.com/img.png" }];
    expect(generateFallbackText(body)).toBe("");
  });

  it("extracts Table cell text with pipe separators", () => {
    const body = [
      {
        type: "Table",
        rows: [
          {
            cells: [
              { items: [{ type: "TextBlock", text: "Name" }] },
              { items: [{ type: "TextBlock", text: "Role" }] },
            ],
          },
          {
            cells: [
              { items: [{ type: "TextBlock", text: "Alice" }] },
              { items: [{ type: "TextBlock", text: "Engineer" }] },
            ],
          },
        ],
      },
    ];
    expect(generateFallbackText(body)).toBe("Name | Role\nAlice | Engineer");
  });

  it("extracts Input label", () => {
    const body = [{ type: "Input.Text", label: "Your Name" }];
    expect(generateFallbackText(body)).toBe("Your Name");
  });

  it("extracts Input placeholder when label is missing", () => {
    const body = [{ type: "Input.Text", placeholder: "Enter name" }];
    expect(generateFallbackText(body)).toBe("[Enter name]");
  });

  it("returns empty string for unsupported elements", () => {
    const body = [{ type: "ActionSet" }, { type: "Media" }];
    expect(generateFallbackText(body)).toBe("");
  });

  it("handles mixed elements", () => {
    const body = [
      { type: "TextBlock", text: "Dashboard", weight: "Bolder" },
      {
        type: "FactSet",
        facts: [{ title: "CPU", value: "42%" }],
      },
      { type: "Image", altText: "Chart" },
    ];
    expect(generateFallbackText(body)).toBe("Dashboard\nCPU: 42%\n[Image: Chart]");
  });

  it("skips null and non-object elements", () => {
    const body = [null, undefined, "string", 42, { type: "TextBlock", text: "Valid" }];
    expect(generateFallbackText(body as unknown[])).toBe("Valid");
  });
});
