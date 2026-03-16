/**
 * Generate plain text fallback from Adaptive Card body elements.
 *
 * Recursively walks the card element tree and extracts human-readable text.
 * Used when the agent omits `fallback_text` so that non-card channels
 * (Telegram, IRC, SMS) always receive meaningful content.
 *
 * Supports Adaptive Cards v1.6 elements including Carousel, CodeBlock,
 * Accordion, TabSet, Charts, Rating, and ProgressBar.
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

      // --- v1.6 elements ---

      case "CodeBlock":
        if (typeof el.codeSnippet === "string") {
          lines.push("```");
          lines.push(el.codeSnippet);
          lines.push("```");
        } else if (typeof el.code === "string") {
          lines.push("```");
          lines.push(el.code);
          lines.push("```");
        }
        break;

      case "Carousel":
        if (Array.isArray(el.pages)) {
          for (let i = 0; i < el.pages.length; i++) {
            const page = el.pages[i] as Record<string, unknown>;
            if (Array.isArray(page.items)) {
              const pageText = generateFallbackText(page.items);
              if (pageText) lines.push(pageText);
            }
          }
        }
        break;

      case "CarouselPage":
        if (Array.isArray(el.items)) {
          lines.push(generateFallbackText(el.items));
        }
        break;

      case "Accordion":
        if (Array.isArray(el.items)) {
          for (const item of el.items) {
            const acc = item as Record<string, unknown>;
            if (typeof acc.title === "string") lines.push(acc.title);
            if (acc.card && typeof acc.card === "object") {
              const card = acc.card as Record<string, unknown>;
              if (Array.isArray(card.body)) {
                lines.push(generateFallbackText(card.body));
              }
            }
          }
        }
        break;

      case "AccordionItem":
        if (typeof el.title === "string") lines.push(el.title);
        if (el.card && typeof el.card === "object") {
          const card = el.card as Record<string, unknown>;
          if (Array.isArray(card.body)) {
            lines.push(generateFallbackText(card.body));
          }
        }
        break;

      case "TabSet":
        if (Array.isArray(el.tabs)) {
          for (const tab of el.tabs) {
            const t = tab as Record<string, unknown>;
            if (typeof t.title === "string") lines.push(`[${t.title}]`);
            if (t.card && typeof t.card === "object") {
              const card = t.card as Record<string, unknown>;
              if (Array.isArray(card.body)) {
                lines.push(generateFallbackText(card.body));
              }
            }
          }
        }
        break;

      case "Chart.Donut":
      case "Chart.Pie":
      case "Chart.Bar":
      case "Chart.Line":
      case "Chart.HorizontalBar": {
        if (typeof el.title === "string") lines.push(el.title);
        if (Array.isArray(el.data)) {
          for (const point of el.data) {
            const p = point as Record<string, unknown>;
            const label = (p.label ?? p.x ?? p.name) as string | undefined;
            const value = p.value ?? p.y;
            if (label && value !== undefined) {
              lines.push(`${label}: ${value}`);
            }
          }
        }
        break;
      }

      case "Rating": {
        const val = Number(el.value) || 0;
        const max = Number(el.max) || 5;
        lines.push(`Rating: ${"★".repeat(val)}${"☆".repeat(Math.max(0, max - val))}`);
        break;
      }

      case "ProgressBar":
      case "ProgressRing":
        if (typeof el.label === "string") lines.push(el.label);
        else lines.push(`Progress: ${el.value ?? "0"}%`);
        break;

      case "Spinner":
        if (typeof el.label === "string") lines.push(el.label);
        break;

      case "CompoundButton":
        if (typeof el.title === "string") lines.push(el.title);
        if (typeof el.description === "string") lines.push(el.description);
        break;

      case "Badge":
        if (typeof el.text === "string") lines.push(`[${el.text}]`);
        break;

      case "ImageSet":
        if (Array.isArray(el.images)) {
          for (const img of el.images) {
            const i = img as Record<string, unknown>;
            if (typeof i.altText === "string") lines.push(`[Image: ${i.altText}]`);
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
