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
import {
  validateCard,
  checkHostCompatibility,
  adaptCardForHost,
  checkCardAccessibility,
} from "./mcp-bridge.js";
import type { CardActionPayload } from "./actions.js";

// Re-export public API — plugin-specific modules
export { CARD_CLOSE_TAG, CARD_OPEN_TAG, DATA_CLOSE_TAG, DATA_OPEN_TAG } from "./constants.js";
export { generateFallbackText } from "./fallback.js";
export { buildCardPromptGuidance } from "./prompt.js";
export { formatActionAsMessage } from "./actions.js";
export type { CardActionPayload } from "./actions.js";

// Re-export MCP-powered modules via bridge
export {
  validateCard,
  checkHostCompatibility,
  adaptCardForHost,
  checkCardAccessibility,
  analyzeCard,
  getValidElementTypes,
  getValidActionTypes,
  getAllPatterns,
} from "./mcp-bridge.js";
export type {
  ValidationResult,
  ValidationIssue,
  CompatibilityResult,
  CompatibilityIssue,
  HostApp,
  ValidationError,
  AccessibilityReport,
  HostCompatibilityReport,
  LayoutPattern,
  CardStats,
} from "./mcp-bridge.js";

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
 * Assemble a full AdaptiveCard v1.6 envelope from tool params.
 * Returns the card object, JSON string, and the computed fallback text.
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

  return { card, cardJson, fallback, templateData };
}

/**
 * Embed card JSON between marker tags inside tool result text.
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
 */
function detectCardCapability(
  channel?: string,
  capabilities?: Record<string, unknown>,
): "native" | "translated" | "fallback" {
  if (capabilities?.adaptiveCards === "native") return "native";
  if (capabilities?.adaptiveCards === "translated") return "translated";
  if (capabilities?.adaptiveCards === false) return "fallback";

  if (!channel) return "native";
  const ch = channel.toLowerCase();
  if (["ios", "android", "web", "macos"].includes(ch)) return "native";
  if (["msteams", "teams", "webex"].includes(ch)) return "native";
  if (["telegram", "slack", "discord"].includes(ch)) return "translated";
  return "fallback";
}

/**
 * Map channel name to host identifier for compatibility checking.
 */
function channelToHost(channel?: string): string | undefined {
  if (!channel) return undefined;
  const ch = channel.toLowerCase();
  if (["msteams", "teams"].includes(ch)) return "teams";
  if (["outlook"].includes(ch)) return "outlook";
  if (["webchat", "web"].includes(ch)) return "webchat";
  if (["webex"].includes(ch)) return "webex";
  if (["viva"].includes(ch)) return "viva-connections";
  return undefined;
}

// ---------------------------------------------------------------------------
// Tool description
// ---------------------------------------------------------------------------

const TOOL_DESCRIPTION = [
  "Render an interactive Adaptive Card inline in the user's chat.",
  "Use this when structured content benefits from visual layout.",
  "",
  "The card renders natively on iOS (SwiftUI), Android (Jetpack Compose),",
  "Teams (Bot Framework), and web. Other channels see fallback text.",
  "",
  "Card schema: Adaptive Cards v1.6 (https://adaptivecards.io/explorer/)",
  "",
  "Body elements: TextBlock, RichTextBlock, CodeBlock, ColumnSet, Container, FactSet,",
  "Image, ImageSet, Table, ActionSet, Carousel, Accordion, TabSet,",
  "Input.Text, Input.Number, Input.Date, Input.Time, Input.Toggle, Input.ChoiceSet,",
  "Chart.Bar, Chart.Line, Chart.Pie, Chart.Donut, Rating, ProgressBar, Badge, Icon.",
  "",
  "Actions: Action.Execute (preferred — server-side with card refresh),",
  "Action.Submit, Action.OpenUrl, Action.ShowCard, Action.ToggleVisibility.",
  "",
  "Common patterns:",
  '- Status card: TextBlock (weight:"Bolder") + FactSet with key-value facts',
  '- Choice picker: TextBlock question + Action.Execute buttons with data payloads',
  '- Data table: Table with header row + data rows, or FactSet for simple pairs',
  '- Progress tracker: FactSet with step names and status values (Done/Pending/In Progress)',
  '- Comparison: ColumnSet with columns, each containing a Container with FactSet',
  '- Approval workflow: Header + details + Action.Execute (Approve/Reject) with verb',
  '- Input form: Input.Text/ChoiceSet + Action.Submit to collect data',
  '- Incident alert: Severity header + impact facts + Acknowledge/Escalate actions',
].join("\n");

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export default function register(api: OpenClawPluginApi) {
  let currentChannel: string | undefined;

  // ── Hook: before_prompt_build ──
  const promptHook = async (event: unknown) => {
    const e = event as Record<string, unknown>;
    const channel = e.channel as string | undefined;
    const capabilities = e.capabilities as Record<string, unknown> | undefined;
    currentChannel = channel;
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
            "Array of card actions (buttons). Prefer Action.Execute for workflows (supports card refresh). " +
            'Example: [{ "type": "Action.Execute", "title": "Approve", "verb": "approve", "data": { "choice": "yes" } }]',
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

      // Validate card structure (powered by MCP's AJV schema validator)
      const validation = validateCard(p.body, p.actions);
      if (!validation.valid) {
        const errorMsgs = validation.errors.map((e) => `- ${e.message}${e.path ? ` (at ${e.path})` : ""}`);
        return textResult(`Card validation failed:\n${errorMsgs.join("\n")}\n\nFix the errors and try again.`);
      }

      // Accessibility check (powered by MCP's accessibility checker)
      const accessibility = checkCardAccessibility(p.body, p.actions);

      // Check host compatibility and auto-adapt if needed
      let body = p.body;
      let actions = p.actions;
      const host = channelToHost(currentChannel);
      let compatNote: string | undefined;

      if (host) {
        const compat = checkHostCompatibility(body, actions, host);
        if (!compat.compatible || compat.issues.length > 0) {
          const adapted = adaptCardForHost(body, actions, host);
          body = adapted.body;
          actions = adapted.actions;
          const changeCount = adapted.changes.length;
          compatNote = `Card adapted for ${compat.host} (${changeCount} change${changeCount !== 1 ? "s" : ""}).`;
        }
      }

      const adaptedParams: AdaptiveCardParams = { ...p, body, actions };
      const { card, cardJson, fallback, templateData } = buildCardPayload(adaptedParams);
      const markedText = buildMarkedText(cardJson, fallback, templateData);

      return {
        content: [{ type: "text" as const, text: markedText }],
        details: {
          adaptiveCard: card,
          templateData: templateData ?? undefined,
          validation: {
            elementCount: validation.elementCount,
            actionCount: validation.actionCount,
            warnings: validation.warnings.length,
          },
          accessibility: {
            score: accessibility.score,
            issues: accessibility.issues.length,
          },
          ...(compatNote ? { hostAdaptation: compatNote } : {}),
        },
      };
    },
  });

  // ── Command: /acard ──
  api.registerCommand({
    name: "acard",
    description: "Send a test Adaptive Card, validate card JSON, or check host compatibility.",
    acceptsArgs: true,
    handler: async (ctx) => {
      const args = ctx.args?.trim() ?? "";

      // /acard test (or no args)
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
            { type: "Action.Execute", title: "Confirm", verb: "test_confirm", data: { action: "test_confirm" } },
          ],
        };
        const cardJson = JSON.stringify(card);
        return {
          text: `Adaptive Cards test card:\n\n${CARD_OPEN_TAG}${cardJson}${CARD_CLOSE_TAG}`,
        };
      }

      // /acard validate <json>
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
            return { text: `Envelope errors:\n${errors.map((e) => `- ${e}`).join("\n")}` };
          }

          // Deep validation via MCP
          const result = validateCard(card.body, card.actions);
          const accessibility = checkCardAccessibility(card.body, card.actions);
          const lines: string[] = [];
          lines.push(
            `Card structure: ${result.valid ? "Valid" : "Invalid"}`,
            `Elements: ${result.elementCount}, Actions: ${result.actionCount}`,
            `Accessibility score: ${accessibility.score}/100`,
          );
          if (result.errors.length > 0) {
            lines.push("", "Errors:");
            for (const e of result.errors) {
              lines.push(`  - ${e.message}${e.path ? ` (${e.path})` : ""}`);
            }
          }
          if (result.warnings.length > 0) {
            lines.push("", "Warnings:");
            for (const w of result.warnings) {
              lines.push(`  - ${w.message}${w.path ? ` (${w.path})` : ""}`);
            }
          }
          if (accessibility.issues.length > 0) {
            lines.push("", "Accessibility issues:");
            for (const issue of accessibility.issues) {
              lines.push(`  - ${issue}`);
            }
          }
          return { text: lines.join("\n") };
        } catch {
          return { text: "Invalid JSON. Could not parse the card." };
        }
      }

      // /acard compat <host> <json>
      if (args.startsWith("compat ")) {
        const rest = args.slice(7).trim();
        const spaceIdx = rest.indexOf(" ");
        if (spaceIdx === -1) {
          return { text: "Usage: /acard compat <host> <card-json>\nHosts: teams, outlook, webchat, windows, viva, webex" };
        }
        const host = rest.slice(0, spaceIdx).trim();
        const jsonStr = rest.slice(spaceIdx + 1).trim();
        try {
          const card = JSON.parse(jsonStr);
          const result = checkHostCompatibility(card.body ?? [], card.actions, host);
          const lines: string[] = [`Host: ${result.host}`, `Compatible: ${result.compatible ? "Yes" : "No"}`];
          if (result.issues.length > 0) {
            lines.push("", "Issues:");
            for (const issue of result.issues) {
              lines.push(`  - [${issue.severity}] ${issue.message}`);
              if (issue.suggestion) lines.push(`    Suggestion: ${issue.suggestion}`);
            }
          }
          return { text: lines.join("\n") };
        } catch {
          return { text: "Invalid JSON. Could not parse the card." };
        }
      }

      // /acard {json}
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
            "Usage: /acard [test | validate <json> | compat <host> <json> | <card-json>]",
            "",
            "/acard test                      - Send a test card to verify rendering",
            "/acard validate {...}            - Validate card JSON + accessibility score",
            "/acard compat teams {...}        - Check card compatibility with a host",
            "/acard {...}                     - Send a custom Adaptive Card JSON",
            "",
            "Hosts: teams, outlook, webchat, windows, viva, webex",
          ].join("\n"),
        };
      }
    },
  });

  // ── Gateway Method: adaptive_cards.action ──
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
        ctx.respond(true, { message, actionData: payload.actionData, verb: payload.actionVerb });
      },
    );
  }
}
