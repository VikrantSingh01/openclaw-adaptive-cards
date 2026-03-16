import { describe, expect, it } from "vitest";
import { formatActionAsMessage } from "./actions.js";
import type { CardActionPayload } from "./actions.js";

describe("formatActionAsMessage", () => {
  it("formats action with title and data", () => {
    const payload: CardActionPayload = {
      actionData: { choice: "staging" },
      actionTitle: "Deploy to staging",
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toContain("[Card action: Deploy to staging]");
    expect(msg).toContain('"choice": "staging"');
  });

  it("uses default title when actionTitle is absent", () => {
    const payload: CardActionPayload = {
      actionData: { ok: true },
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toContain("[Card action: Card action]");
  });

  it("handles complex action data", () => {
    const payload: CardActionPayload = {
      actionData: { task: "tests", status: "complete", ids: [1, 2, 3] },
      actionTitle: "Mark Complete",
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toContain("[Card action: Mark Complete]");
    expect(msg).toContain('"task": "tests"');
    expect(msg).toContain('"ids"');
  });

  it("handles empty action data", () => {
    const payload: CardActionPayload = {
      actionData: {},
      actionTitle: "Confirm",
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toContain("[Card action: Confirm]");
    expect(msg).toContain("{}");
  });

  it("includes verb from Action.Execute", () => {
    const payload: CardActionPayload = {
      actionData: { decision: "approved" },
      actionTitle: "Approve",
      actionVerb: "expense_approve",
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toContain("[Card action: Approve (verb: expense_approve)]");
    expect(msg).toContain('"decision": "approved"');
  });

  it("omits verb when not present", () => {
    const payload: CardActionPayload = {
      actionData: { choice: "yes" },
      actionTitle: "OK",
    };
    const msg = formatActionAsMessage(payload);
    expect(msg).toBe('[Card action: OK]\n{\n  "choice": "yes"\n}');
    expect(msg).not.toContain("verb");
  });
});
