import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import {
  AC_VERSION,
  CARD_CLOSE_TAG,
  CARD_OPEN_TAG,
  DATA_CLOSE_TAG,
  DATA_OPEN_TAG,
  DEFAULT_FALLBACK,
} from "./constants.js";
import { generateFallbackText } from "./fallback.js";

// Re-export public API for consumers that parse markers themselves
export { CARD_CLOSE_TAG, CARD_OPEN_TAG, DATA_CLOSE_TAG, DATA_OPEN_TAG } from "./constants.js";
export { generateFallbackText } from "./fallback.js";

/** Shape of the tool params after type-assertion. */
interface AdaptiveCardParams {
  body: unknown[];
  actions?: unknown[];
  fallback_text?: string;
  template_data?: unknown;
}

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    details: { text },
  };
}

/**
 * Assemble a full AdaptiveCard v1.5 envelope from tool params.
 * Returns the JSON string and the computed fallback text.
 */
function buildCardPayload(params: AdaptiveCardParams) {
  const card: Record<string, unknown> = {
    type: "AdaptiveCard",
    version: AC_VERSION,
    body: params.body,
  };
  if (Array.isArray(params.actions) && params.actions.length > 0) {
    card.actions = params.actions;
  }

  const cardJson = JSON.stringify(card);
  const generated = generateFallbackText(params.body);
  const fallback = params.fallback_text || generated || DEFAULT_FALLBACK;
  const templateData = params.template_data ?? null;

  return { cardJson, fallback, templateData };
}

/**
 * Embed card JSON between marker tags inside tool result text.
 *
 * The text survives gateway sanitization (which only truncates, doesn't strip).
 * Mobile apps extract the JSON between markers and render natively.
 * Channels that don't parse markers just show the fallback text.
 */
function buildMarkedText(cardJson: string, fallback: string, templateData: unknown): string {
  const parts: string[] = [];
  if (fallback) {
    parts.push(fallback, "");
  }
  parts.push(`${CARD_OPEN_TAG}${cardJson}${CARD_CLOSE_TAG}`);
  if (templateData) {
    parts.push(`${DATA_OPEN_TAG}${JSON.stringify(templateData)}${DATA_CLOSE_TAG}`);
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export default function register(api: OpenClawPluginApi) {
  // ── Tool: adaptive_card ──
  api.registerTool({
    name: "adaptive_card",
    label: "Adaptive Card",
    description: [
      "Render an interactive Adaptive Card in the user's chat.",
      "Use this for structured content that benefits from visual layout:",
      "status dashboards, option selections, forms, progress tracking,",
      "data tables, fact sets, or any response where tapping is better than typing.",
      "",
      "The card renders natively on iOS (SwiftUI), Android (Jetpack Compose),",
      "and Teams (Bot Framework). Other channels see the fallback text.",
      "",
      "Card schema follows Adaptive Cards v1.5: https://adaptivecards.io/explorer/",
      "Common body element types: TextBlock, RichTextBlock, ColumnSet, Container,",
      "FactSet, Image, ImageSet, Table, ActionSet, Input.Text, Input.Number,",
      "Input.Date, Input.Time, Input.Toggle, Input.ChoiceSet.",
      "Common action types: Action.Submit, Action.OpenUrl, Action.ShowCard.",
    ].join("\n"),
    parameters: Type.Object({
      body: Type.Array(Type.Unknown(), {
        description:
          "Array of Adaptive Card body elements. " +
          'Example: [{ "type": "TextBlock", "text": "Hello", "weight": "Bolder" }]',
      }),
      actions: Type.Optional(
        Type.Array(Type.Unknown(), {
          description:
            "Array of card actions (buttons). " +
            'Example: [{ "type": "Action.Submit", "title": "Approve", "data": { "choice": "yes" } }]',
        }),
      ),
      fallback_text: Type.Optional(
        Type.String({
          description:
            "Plain text shown on channels that cannot render cards (Telegram, IRC, etc.). " +
            "If omitted, a summary is auto-generated from the card body.",
        }),
      ),
      template_data: Type.Optional(
        Type.Unknown({
          description:
            "Data context for client-side template expansion. " +
            "Use ${expression} syntax in card body and pass data here.",
        }),
      ),
    }),
    async execute(_toolCallId, params) {
      const p = params as AdaptiveCardParams;

      if (!Array.isArray(p.body) || p.body.length === 0) {
        return textResult("Error: card body must be a non-empty array of elements.");
      }

      const { cardJson, fallback, templateData } = buildCardPayload(p);
      const markedText = buildMarkedText(cardJson, fallback, templateData);

      return {
        content: [{ type: "text" as const, text: markedText }],
        details: { adaptiveCard: cardJson, templateData },
      };
    },
  });

  // ── Command: /acard ──
  // Named "acard" (not "card") to avoid collision with other plugins' /card commands.
  api.registerCommand({
    name: "acard",
    description: "Send a test Adaptive Card to verify rendering.",
    acceptsArgs: true,
    handler: async (ctx) => {
      const args = ctx.args?.trim() ?? "";

      // /acard test (or no args) — send a canned test card
      if (args === "test" || !args) {
        const card = {
          type: "AdaptiveCard",
          version: AC_VERSION,
          body: [
            { type: "TextBlock", text: "Adaptive Cards Test", weight: "Bolder", size: "Large" },
            {
              type: "FactSet",
              facts: [
                { title: "Platform", value: "OpenClaw" },
                { title: "Status", value: "Connected" },
                { title: "Version", value: AC_VERSION },
              ],
            },
            {
              type: "TextBlock",
              text: "If you see this as a native card, rendering works.",
              isSubtle: true,
            },
          ],
          actions: [
            { type: "Action.Submit", title: "Confirm", data: { action: "test_confirm" } },
          ],
        };
        const cardJson = JSON.stringify(card);
        return {
          text: `Adaptive Cards test card:\n\n${CARD_OPEN_TAG}${cardJson}${CARD_CLOSE_TAG}`,
        };
      }

      // /acard {json} — send custom card JSON
      try {
        const card = JSON.parse(args);
        if (!card.type || card.type !== "AdaptiveCard") {
          return { text: 'Invalid card: must have "type": "AdaptiveCard".' };
        }
        const cardJson = JSON.stringify(card);
        return { text: `${CARD_OPEN_TAG}${cardJson}${CARD_CLOSE_TAG}` };
      } catch {
        return {
          text: [
            "Usage: /acard [test | <card-json>]",
            "",
            "/acard test   - Send a test card to verify rendering",
            "/acard {...}  - Send a custom Adaptive Card JSON",
          ].join("\n"),
        };
      }
    },
  });
}
