/**
 * Generate plain text fallback from Adaptive Card body elements.
 *
 * Recursively walks the card element tree and extracts human-readable text.
 * Used when the agent omits `fallback_text` so that non-card channels
 * (Telegram, IRC, SMS) always receive meaningful content.
 *
 * @param body - Array of Adaptive Card body elements
 * @returns Plain text summary, or empty string if no text can be extracted
 */
export function generateFallbackText(body: unknown[]): string {
  const lines: string[] = [];

  for (const element of body) {
    if (!element || typeof element !== "object") continue;
    const el = element as Record<string, unknown>;
    const type = typeof el.type === "string" ? el.type : "";

    switch (type) {
      case "TextBlock":
        if (typeof el.text === "string") lines.push(el.text);
        break;

      case "RichTextBlock":
        // RichTextBlock content lives in inlines (TextRun[]), not a top-level text field.
        if (Array.isArray(el.inlines)) {
          const texts: string[] = [];
          for (const inline of el.inlines) {
            if (typeof inline === "string") {
              texts.push(inline);
            } else if (inline && typeof inline === "object") {
              const run = inline as Record<string, unknown>;
              if (typeof run.text === "string") texts.push(run.text);
            }
          }
          if (texts.length > 0) lines.push(texts.join(""));
        }
        break;

      case "FactSet":
        if (Array.isArray(el.facts)) {
          for (const fact of el.facts) {
            const f = fact as Record<string, unknown>;
            if (typeof f.title === "string" && typeof f.value === "string") {
              lines.push(`${f.title}: ${f.value}`);
            }
          }
        }
        break;

      case "ColumnSet":
        if (Array.isArray(el.columns)) {
          for (const col of el.columns) {
            const c = col as Record<string, unknown>;
            if (Array.isArray(c.items)) {
              lines.push(generateFallbackText(c.items));
            }
          }
        }
        break;

      case "Container":
        if (Array.isArray(el.items)) {
          lines.push(generateFallbackText(el.items));
        }
        break;

      case "Image":
        if (typeof el.altText === "string") lines.push(`[Image: ${el.altText}]`);
        break;

      case "Table":
        if (Array.isArray(el.rows)) {
          for (const row of el.rows) {
            const r = row as Record<string, unknown>;
            if (Array.isArray(r.cells)) {
              const cellTexts: string[] = [];
              for (const cell of r.cells) {
                const c = cell as Record<string, unknown>;
                if (Array.isArray(c.items)) {
                  const t = generateFallbackText(c.items);
                  if (t) cellTexts.push(t);
                }
              }
              if (cellTexts.length > 0) lines.push(cellTexts.join(" | "));
            }
          }
        }
        break;

      default:
        // Input elements: extract label or placeholder as fallback context.
        if (type.startsWith("Input.")) {
          if (typeof el.label === "string") lines.push(el.label);
          else if (typeof el.placeholder === "string") lines.push(`[${el.placeholder}]`);
        }
        break;
    }
  }

  return lines.filter(Boolean).join("\n");
}
