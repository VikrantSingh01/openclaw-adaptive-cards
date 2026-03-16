/**
 * Action routing for Adaptive Card button taps.
 *
 * When a user taps an Action.Submit button on a rendered card, the client
 * sends the action data to the gateway via the `adaptive_cards.action` method.
 * This module registers that gateway method and converts the action into a
 * follow-up message that the agent can process.
 */

/** Payload sent by clients when a card action is tapped. */
export interface CardActionPayload {
  /** The action data from Action.Submit or Action.Execute (the `data` field from the card JSON). */
  actionData: Record<string, unknown>;
  /** Human-readable label of the button that was tapped. */
  actionTitle?: string;
  /** The verb from Action.Execute, used for server-side routing. */
  actionVerb?: string;
  /** Session identifier so the action is routed to the correct agent session. */
  sessionKey?: string;
}

/**
 * Format a card action into a user-facing message that the agent can process.
 *
 * The message is structured so the agent understands it came from a card tap,
 * not from the user typing. This enables the agent to respond contextually.
 */
export function formatActionAsMessage(payload: CardActionPayload): string {
  const title = payload.actionTitle ?? "Card action";
  const verb = payload.actionVerb ? ` (verb: ${payload.actionVerb})` : "";
  const dataStr = JSON.stringify(payload.actionData, null, 2);
  return `[Card action: ${title}${verb}]\n${dataStr}`;
}
