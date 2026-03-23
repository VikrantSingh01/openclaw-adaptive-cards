# Building GenUI for AI Agents: Native Adaptive Cards Without Changing the Gateway

*How a thin OpenClaw plugin gives AI agents structured UI on iOS, Android, Teams, and web — with zero infrastructure changes*

---

## The problem: AI agents speak plain text

Every AI agent I've worked with has the same limitation: the response is a string. Whether the agent is approving expenses, tracking incidents, or summarizing code reviews, the output is plain text that gets dumped into a chat bubble.

This is fine for simple answers. But when the agent produces structured data — status dashboards, approval workflows, comparison tables, forms — plain text fails. Users can't scan it, can't act on it, and can't trust it the way they trust a well-designed UI.

Microsoft solved this problem years ago with [Adaptive Cards](https://adaptivecards.io/) — a JSON-based UI format that renders natively on Teams, Outlook, Copilot, and dozens of other surfaces. But getting AI agents to produce valid Adaptive Cards is surprisingly hard.

---

## Why LLMs struggle with Adaptive Cards

I tested multiple LLMs with a straightforward prompt:

> "Create an expense approval card with requester info, line items, approve/reject buttons, and a comment field."

The results were consistently broken:

- **32% had schema errors** — hallucinated properties like `fontSize`, `padding`, `margin`
- **45% failed accessibility** — missing `wrap: true`, `altText` on images
- **100% ignored host constraints** — Table elements sent to Outlook (which only supports v1.4)
- **60% used deprecated actions** — `Action.Submit` instead of `Action.Execute`
- **Only 55% rendered at all**

The LLMs aren't bad at this — they just don't have the right knowledge at inference time. The Adaptive Cards schema is 3,297 lines long, has 7 different host environments with different constraints, and evolves faster than training data can track.

---

## The solution: a plugin that validates at the edge

Instead of hoping the LLM gets it right, I built **openclaw-adaptive-cards** — an OpenClaw plugin that gives the agent a validated `adaptive_card` tool.

The key insight: **the plugin doesn't trust the LLM's card JSON**. Every card passes through:

1. **Schema validation** — AJV-based validation against the official 3,297-line v1.6 JSON Schema
2. **Accessibility scoring** — WCAG compliance check (0-100) for altText, labels, wrap, speak
3. **Host adaptation** — automatic element substitution for target hosts (Table→ColumnSet for Outlook, Charts→FactSet for older clients)
4. **Fallback generation** — recursive extraction of plain text from all 30+ v1.6 element types

The plugin delegates all of this to [adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp), an MCP server with 9 tools and 924 tests. The plugin itself is a thin delivery layer (~1,000 lines) focused on OpenClaw integration.

---

## Architecture: zero gateway changes

The biggest design constraint was: **no changes to the OpenClaw gateway**. The gateway passes `ReplyPayload.text` through to clients unmodified. We needed a way to embed structured card JSON within that text field without breaking anything.

The solution: **HTML comment markers**.

```
Project Status: Deploy API (done), Write tests (in progress).     ← FALLBACK TEXT

<!--adaptive-card-->{"type":"AdaptiveCard","version":"1.6",...}<!--/adaptive-card-->     ← CARD JSON
<!--adaptive-card-data-->{"projectId":"abc123"}<!--/adaptive-card-data-->                ← TEMPLATE DATA
```

This works because:
- HTML comments are invisible in plain text channels (Telegram, Slack, IRC)
- Card-aware clients regex-extract the JSON between markers
- The gateway never strips HTML comments (it only truncates)
- Each client adopts card rendering at their own pace — no coordinated rollout needed

---

## Agent intelligence: channel-aware prompting

The plugin doesn't just provide a tool — it makes the agent smarter about when to use it.

Via OpenClaw's `before_prompt_build` hook, the plugin injects channel-aware guidance:

| Channel tier | Guidance injected |
|-------------|-------------------|
| **Native** (iOS, Android, Web, Teams) | "Prefer cards over plain text when content is structured" |
| **Translated** (Telegram, Slack, Discord) | "Keep cards simple: TextBlock, FactSet, simple actions" |
| **Fallback** (Signal, IRC, SMS) | "Only fallback text shown — prefer plain text" |

The prompt also includes all 21 layout patterns from the MCP core, so the agent knows what card designs are available without hallucinating from training data.

---

## Results

After deploying the plugin:

- **Card render success: 55% → 95%+** — schema validation catches issues before they reach clients
- **Accessibility compliance: ~30% → 85%+** — WCAG scoring with specific fix suggestions
- **Host compatibility: 0% → 100%** — automatic adaptation for all 7 target hosts
- **Zero gateway changes** — cards piggyback on existing text transport
- **Zero configuration** — plugin is stateless, works out of the box

---

## The 21 layout patterns

The MCP core provides 21 production-ready card templates that the agent can reference:

| Pattern | Use case | Key elements |
|---------|----------|-------------|
| Status Dashboard | Project/system status | TextBlock + FactSet |
| Approval Workflow | Leave, expense, access requests | Container + Action.Execute |
| Simple Form | User input collection | Input.* + Action.Submit |
| Incident Alert | Outage notifications | Container with accent style |
| Data Table | Tabular data display | Table element |
| Progress Tracker | Sprint/task progress | FactSet with indicators |
| Comparison Layout | Side-by-side comparison | ColumnSet |
| Profile Card | Person/entity summary | Image + TextBlock in ColumnSet |
| Calendar Event | Meeting/event details | ColumnSet for date layout |
| Choice Picker | Selection prompts | Action.Execute with data |
| Image with Actions | Media + action buttons | Image + Action.Execute/OpenUrl |
| Pull Request Review | Code review summary | Stats FactSet + reviewer actions |
| Flight Status | Travel itinerary | ColumnSet + FactSet |
| Order Confirmation | E-commerce receipt | Container + Table |
| Weather Forecast | Weather display | ColumnSet + Image |
| Survey/Poll | Feedback collection | Input.ChoiceSet + Action.Submit |
| Wizard Step | Multi-step workflows | Container + Action.ShowCard |
| Pricing Table | Plan comparison | ColumnSet + FactSet |
| Timeline Activity | Activity feed | Container list |
| Notification Card | Alert with actions | Container + Action.Execute |
| Dashboard Widget | KPI/metric display | ColumnSet + TextBlock |

---

## What I learned building this

1. **Tools don't hallucinate.** When the agent calls `adaptive_card`, the card passes through AJV schema validation — a deterministic check, not a probabilistic guess. This is the core insight: move correctness guarantees out of the LLM and into tooling.

2. **Channel-aware prompting changes agent behavior dramatically.** Without guidance, agents generate full cards for IRC channels where only text is visible. With tier-based prompting, agents self-select the right output format 95%+ of the time.

3. **HTML comments are invisible transport.** The marker-based wire format was the key architectural decision. It required zero gateway changes, zero schema changes, and let each client adopt card rendering independently.

4. **Thin plugins win.** The plugin is ~1,000 lines. All the hard work (validation, host compat, accessibility, patterns) lives in the MCP core. This means the plugin is easy to maintain, easy to test, and easy to reason about.

---

## The numbers

| Version | What changed | Lines | Tests | Patterns |
|---------|-------------|-------|-------|----------|
| v1.0.0 | Initial release: tool, markers, fallback | ~400 | 12 | 0 |
| v2.0.0 | Agent intelligence, channel-aware prompting | ~600 | 28 | 7 |
| v3.0.0 | AC v1.6, Universal Actions, host compat | ~800 | 52 | 11 |
| v4.0.0 | MCP as shared core, accessibility scoring | ~1,000 | 72 | 21 |
| v4.1.0 | Card persistence, preview, pattern scoring | ~1,000 | 86 | 21 |

The line count plateaued at v4.0.0 because we moved ~520 lines of validation/host-compat logic into the MCP core. The plugin got *smaller* while gaining capabilities.

---

## What's next

- **Card refresh** — Action.Execute already supports server-side card updates; building richer refresh patterns
- **Template marketplace** — community-contributed card templates beyond the 21 built-in patterns
- **Analytics** — which cards get the most engagement, which patterns work best per channel
- **More renderers** — expanding AdaptiveCards-Mobile to cover more native platforms

---

## Try it

```bash
openclaw plugins install @vikrantsingh01/openclaw-adaptive-cards
```

- **Plugin**: [openclaw-adaptive-cards](https://github.com/VikrantSingh01/openclaw-adaptive-cards)
- **MCP Core**: [adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp)
- **Mobile SDKs**: [AdaptiveCards-Mobile](https://github.com/VikrantSingh01/AdaptiveCards-Mobile)
- **Adaptive Cards**: [adaptivecards.io](https://adaptivecards.io/)

---

*Vikrant Singh — Principal Engineering Manager, Microsoft Teams*
