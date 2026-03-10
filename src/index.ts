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
import { buildCardPromptGuidance } from "./prompt.js";
import { formatActionAsMessage } from "./actions.js";
import type { CardActionPayload } from "./actions.js";

// Re-export public API for consumers that parse markers themselves
export { CARD_CLOSE_TAG, CARD_OPEN_TAG, DATA_CLOSE_TAG, DATA_OPEN_TAG } from "./constants.js";
export { generateFallbackText } from "./fallback.js";
export { buildCardPromptGuidance } from "./prompt.js";
export { formatActionAsMessage } from "./actions.js";
export type { CardActionPayload } from "./actions.js";

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

/**
 * Detect the card capability level from channel metadata.
 * Returns "native", "translated", or "fallback" based on the channel type.
 */
function detectCardCapability(
  channel?: string,
  capabilities?: Record<string, unknown>,
): "native" | "translated" | "fallback" {
  // Explicit capability declaration takes precedence
  if (capabilities?.adaptiveCards === "native") return "native";
  if (capabilities?.adaptiveCards === "translated") return "translated";
  if (capabilities?.adaptiveCards === false) return "fallback";

  // Infer from channel type when explicit capability is absent
  if (!channel) return "native"; // default (web/mobile chat)
  const ch = channel.toLowerCase();
  if (["ios", "android", "web", "macos"].includes(ch)) return "native";
  if (["msteams", "teams", "webex"].includes(ch)) return "native";
  if (["telegram", "slack", "discord"].includes(ch)) return "translated";
  return "fallback";
}

// ---------------------------------------------------------------------------
// Tool description with embedded card pattern examples
// ---------------------------------------------------------------------------

const TOOL_DESCRIPTION = [
  "Render an interactive Adaptive Card inline in the user's chat.",
  "Use this when structured content benefits from visual layout.",
  "",
  "The card renders natively on iOS (SwiftUI), Android (Jetpack Compose),",
  "Teams (Bot Framework), and web. Other channels see fallback text.",
  "",
  "Card schema: Adaptive Cards v1.5 (https://adaptivecards.io/explorer/)",
  "",
  "Body elements: TextBlock, RichTextBlock, ColumnSet, Container, FactSet,",
  "Image, ImageSet, Table, ActionSet, Input.Text, Input.Number, Input.Date,",
  "Input.Time, Input.Toggle, Input.ChoiceSet.",
  "",
  "Actions: Action.Submit, Action.OpenUrl, Action.ShowCard.",
  "",
  "Common patterns:",
  '- Status card: TextBlock (weight:"Bolder") + FactSet with key-value facts',
  '- Choice picker: TextBlock question + Action.Submit buttons with data payloads',
  '- Data table: FactSet for simple pairs, or Table for multi-column data',
  '- Progress tracker: FactSet with step names and status values (Done/Pending/In Progress)',
  '- Comparison: ColumnSet with columns, each containing a Container with FactSet',
].join("\n");

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export default function register(api: OpenClawPluginApi) {
  // ── Hook: before_prompt_build ──
  // Inject card usage guidance into the system prompt so the agent makes
  // intelligent decisions about when to use cards vs plain text.
  // Inject card usage guidance into the system prompt.
  // Cast handler to satisfy InternalHookHandler — the event shape includes
  // channel and capabilities at runtime but the base type is narrower.
  const promptHook = async (event: unknown) => {
    const e = event as Record<string, unknown>;
    const channel = e.channel as string | undefined;
    const capabilities = e.capabilities as Record<string, unknown> | undefined;
    const capability = detectCardCapability(channel, capabilities);
    return { appendSystemContext: buildCardPromptGuidance(capability) };
  };
  api.registerHook("before_prompt_build", promptHook as unknown as Parameters<typeof api.registerHook>[1], {
    name: "adaptive-cards.prompt-guidance",
  });

  // ── Tool: adaptive_card ──
  api.registerTool({
    name: "adaptive_card",
    label: "Adaptive Card",
    description: TOOL_DESCRIPTION,
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
    description: "Send a test Adaptive Card or validate card JSON.",
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

      // /acard validate <json> — validate card JSON structure
      if (args.startsWith("validate ")) {
        const jsonStr = args.slice(9).trim();
        try {
          const card = JSON.parse(jsonStr);
          const errors: string[] = [];
          if (card.type !== "AdaptiveCard") errors.push('Missing or wrong "type" (must be "AdaptiveCard")');
          if (!card.version) errors.push('Missing "version" field');
          if (!Array.isArray(card.body)) errors.push('"body" must be an array');
          else if (card.body.length === 0) errors.push('"body" array is empty');
          if (card.actions && !Array.isArray(card.actions)) errors.push('"actions" must be an array');

          if (errors.length > 0) {
            return { text: `Validation errors:\n${errors.map((e) => `- ${e}`).join("\n")}` };
          }
          return { text: `Card is valid. ${card.body.length} body element(s), ${card.actions?.length ?? 0} action(s).` };
        } catch {
          return { text: "Invalid JSON. Could not parse the card." };
        }
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
            "Usage: /acard [test | validate <json> | <card-json>]",
            "",
            "/acard test            - Send a test card to verify rendering",
            "/acard validate {...}  - Validate card JSON structure",
            "/acard {...}           - Send a custom Adaptive Card JSON",
          ].join("\n"),
        };
      }
    },
  });

  // ── Gateway Method: adaptive_cards.action ──
  // Clients call this when a user taps an Action.Submit button on a rendered card.
  // The action data is formatted as a follow-up message for the agent to process.
  if (typeof api.registerGatewayMethod === "function") {
    api.registerGatewayMethod(
      "adaptive_cards.action",
      (ctx: { respond: (ok: boolean, payload?: unknown) => void; params?: unknown }) => {
        const payload = ctx.params as CardActionPayload | undefined;
        if (!payload?.actionData) {
          ctx.respond(false, { error: "Missing actionData in payload" });
          return;
        }
        const message = formatActionAsMessage(payload);
        ctx.respond(true, { message, actionData: payload.actionData });
      },
    );
  }
}
