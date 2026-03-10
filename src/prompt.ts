/**
 * System prompt guidance for the agent on when and how to use Adaptive Cards.
 *
 * Injected via the `before_prompt_build` hook so the agent understands
 * card capabilities and makes intelligent card-vs-text decisions.
 */

/**
 * Build the system prompt appendix based on the current channel's card support level.
 *
 * @param capability - "native" (iOS/Android/Web/Teams), "translated" (Telegram/Slack/Discord),
 *                     or "fallback" (Signal/IRC/SMS — cards not rendered)
 */
export function buildCardPromptGuidance(capability: "native" | "translated" | "fallback"): string {
  const lines: string[] = [
    "## Adaptive Cards",
    "",
    "You have the `adaptive_card` tool to render structured, interactive content inline in chat.",
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
    "",
    "### When NOT to use cards",
    "",
    "- Simple conversational text responses",
    "- Long-form explanations, stories, or detailed reasoning",
    "- Code output (use fenced code blocks instead)",
    "- Single-value answers (just reply with text)",
    "",
    "### Common card patterns",
    "",
    "**Status card:** TextBlock header (weight: Bolder) + FactSet for key-value pairs",
    "**Choice picker:** TextBlock question + Action.Submit buttons with data payloads",
    "**Data table:** Table element with header row + data rows, or FactSet for simple pairs",
    "**Progress tracker:** TextBlock steps with checkmark/pending indicators in FactSet",
    "**Comparison:** ColumnSet with multiple columns, each containing a Container with facts",
  );

  return lines.join("\n");
}
