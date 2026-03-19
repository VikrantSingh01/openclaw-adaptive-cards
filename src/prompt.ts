/**
 * System prompt guidance for the agent on when and how to use Adaptive Cards.
 *
 * Injected via the `before_prompt_build` hook so the agent understands
 * card capabilities and makes intelligent card-vs-text decisions.
 *
 * Layout patterns are dynamically loaded from the adaptive-cards-mcp library
 * (21 patterns including approval, incident, calendar, PR review, etc.).
 *
 * v4.1.0: Added host compatibility matrix, validation pipeline info,
 * accessibility guidance, and Action.Execute best practices.
 */

import { getAllPatterns, getAllHostSupport } from "./mcp-bridge.js";

/**
 * Build the system prompt appendix based on the current channel's card support level.
 *
 * @param capability - "native" (iOS/Android/Web/Teams), "translated" (Telegram/Slack/Discord),
 *                     or "fallback" (Signal/IRC/SMS — cards not rendered)
 * @param host - Optional host identifier for host-specific guidance
 */
export function buildCardPromptGuidance(
  capability: "native" | "translated" | "fallback",
  host?: string,
): string {
  const lines: string[] = [
    "## Adaptive Cards",
    "",
    "You have the `adaptive_card` tool to render structured, interactive content inline in chat.",
    "Cards use Adaptive Cards v1.6 schema (https://adaptivecards.io/explorer/).",
    "",
    "Every card you emit is automatically:",
    "- Validated against the official v1.6 JSON Schema (AJV)",
    "- Scored for WCAG accessibility (0-100)",
    "- Adapted for the target host (Teams, Outlook, Webex, etc.)",
    "- Given fallback text for non-card channels",
    "",
  ];

  // Capability-specific guidance
  if (capability === "native") {
    lines.push(
      "The current channel renders Adaptive Cards **natively** with full visual fidelity.",
      "Cards appear inline in the chat stream with native UI elements (buttons, forms, tables).",
      "Prefer cards over plain text when the content is structured.",
      "",
    );
  } else if (capability === "translated") {
    lines.push(
      "The current channel **translates** Adaptive Cards to platform-native formats (e.g., Slack Block Kit, Telegram inline keyboards).",
      "Keep cards simple: use TextBlock, FactSet, and simple actions. Avoid deeply nested ColumnSets or Input elements (they may not translate fully).",
      "",
    );
  } else {
    lines.push(
      "The current channel does **not** render Adaptive Cards. Only fallback text is shown.",
      "You may still use the tool if the fallback text is sufficient, but prefer plain text or markdown for this channel.",
      "",
    );
  }

  lines.push(
    "### When to use cards",
    "",
    "- Presenting structured data (status, facts, key-value pairs, comparisons)",
    "- Offering the user choices or options to tap instead of type",
    "- Showing progress or step-by-step status tracking",
    "- Displaying data tables or fact sheets",
    "- Summarizing multi-field results (API responses, search results, dashboards)",
    "- Approval workflows (approve/reject with Action.Execute for server-side refresh)",
    "- Collecting user input via forms (Input.Text, Input.ChoiceSet, etc.)",
    "",
    "### When NOT to use cards",
    "",
    "- Simple conversational text responses",
    "- Long-form explanations, stories, or detailed reasoning",
    "- Code output (use fenced code blocks instead)",
    "- Single-value answers (just reply with text)",
    "",
    "### Body elements",
    "",
    "**Core:** TextBlock, Image, RichTextBlock, CodeBlock",
    "**Containers:** Container, ColumnSet, FactSet, ImageSet, Table, ActionSet, List",
    "**Advanced:** Carousel, Accordion, TabSet",
    "**Inputs:** Input.Text, Input.Number, Input.Date, Input.Time, Input.Toggle, Input.ChoiceSet, Input.Rating, Input.DataGrid",
    "**Charts:** Chart.Bar, Chart.Line, Chart.Pie, Chart.Donut, Chart.HorizontalBar (Teams)",
    "**Other:** Rating, ProgressBar, ProgressRing, Spinner, Badge, Icon, CompoundButton",
    "",
    "### Actions",
    "",
    "**Action.Execute** — Server-side processing with automatic card refresh (preferred for workflows)",
    "  - Use `verb` for routing (e.g., `\"verb\": \"approve\"`) and `data` for payload",
    "  - Supports card refresh: server returns updated card JSON after action",
    "  - Auto-downgraded to Action.Submit on hosts that don't support it (Webex, older clients)",
    "**Action.Submit** — Client-side data submission (legacy, still widely supported)",
    "**Action.OpenUrl** — Open a URL in the browser",
    "**Action.ShowCard** — Reveal a nested card inline (expandable sections)",
    "**Action.ToggleVisibility** — Show/hide elements by targetElementId",
    "",
  );

  // Accessibility best practices
  lines.push(
    "### Accessibility (WCAG)",
    "",
    "Cards are scored 0-100 for accessibility. To maximize your score:",
    "- Always set `altText` on Image elements",
    "- Always set `label` on Input elements",
    "- Set `wrap: true` on TextBlock (prevents text clipping)",
    "- Set `title` on all Action buttons",
    "- Add a `speak` property to the card for screen readers",
    "",
  );

  // Host compatibility
  if (capability === "native") {
    lines.push("### Host compatibility", "");
    try {
      const hosts = getAllHostSupport();
      for (const [hostName, info] of Object.entries(hosts)) {
        const maxVer = (info as Record<string, unknown>).maxVersion ?? "1.6";
        const unsupported = (info as Record<string, unknown>).unsupportedElements;
        if (Array.isArray(unsupported) && unsupported.length > 0) {
          lines.push(`**${hostName}** (v${maxVer}): Avoid ${unsupported.slice(0, 5).join(", ")}${unsupported.length > 5 ? ` (+${unsupported.length - 5} more)` : ""}`);
        } else {
          lines.push(`**${hostName}** (v${maxVer}): Full support`);
        }
      }
      lines.push("");
    } catch {
      // If getAllHostSupport fails, skip host section gracefully
    }
  }

  // Dynamic layout patterns from MCP library
  const patterns = getAllPatterns();
  lines.push("### Available card patterns (21)", "");
  for (const p of patterns) {
    lines.push(`**${p.name}:** ${p.description}`);
  }

  return lines.join("\n");
}
