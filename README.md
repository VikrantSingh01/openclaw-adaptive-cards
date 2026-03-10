# openclaw-adaptive-cards

Adaptive Cards plugin for [OpenClaw](https://openclaw.ai) — gives the AI an `adaptive_card` tool to respond with native [Adaptive Cards](https://adaptivecards.io/) (v1.5) instead of plain text.

Cards render natively on:
- **iOS** — SwiftUI via [Teams-AdaptiveCards-Mobile](https://github.com/microsoft/Teams-AdaptiveCards-Mobile)
- **Android** — Jetpack Compose via Teams-AdaptiveCards-Mobile
- **Teams** — Bot Framework attachment (native AC rendering)
- **Web** — [adaptivecards.io](https://www.npmjs.com/package/adaptivecards) JavaScript SDK

Channels that don't support cards (Telegram, Slack, IRC) see auto-generated fallback text.

## Install

```bash
openclaw plugins install @vikrantsingh01/openclaw-adaptive-cards
```

## Architecture

### High-Level Flow

```
Agent LLM
  │  decides structured content is appropriate
  ▼
adaptive_card tool executes (this plugin)
  │  assembles AdaptiveCard v1.5 JSON
  │  generates fallback text
  │  embeds both in HTML comment markers
  ▼
Gateway passes text through unmodified
  │  no schema changes, no hooks, no middleware
  │  cards piggyback on existing ReplyPayload.text
  ▼
Client receives tool result text
  │
  ├─► iOS / Android ── regex-extract JSON ── Teams-AdaptiveCards-Mobile SDK ── native SwiftUI / Compose view
  ├─► MS Teams ─────── regex-extract JSON ── Bot Framework Attachment ──────── native Teams card
  ├─► Web UI ──────── regex-extract JSON ── adaptivecards.io JS SDK ────────── rendered in browser
  └─► Telegram / Slack / IRC ── markers invisible (HTML comments) ──────────── shows fallback text only
```

### Marker Wire Format

The tool result text contains three sections:

```
Project Status: Deploy API (done), Write tests (in progress).     ← FALLBACK TEXT (always visible)

<!--adaptive-card-->{"type":"AdaptiveCard","version":"1.5",...}<!--/adaptive-card-->     ← CARD JSON
<!--adaptive-card-data-->{"projectId":"abc123"}<!--/adaptive-card-data-->                ← TEMPLATE DATA (optional)
```

| Section | Purpose |
|---|---|
| **Fallback text** | Auto-generated or agent-provided. Visible on all channels. Non-card channels only see this. |
| **Card JSON** | Full AdaptiveCard v1.5 envelope. Clients regex between `<!--adaptive-card-->` markers. Gateway never touches this. |
| **Template data** | Optional. Enables client-side `${expression}` expansion. Separated from card body for clean data binding. |

### Plugin Layers

```
src/index.ts (260 lines)
  │
  ├── AI Tool Layer (lines 22-115)
  │     Register adaptive_card tool via plugin SDK
  │     Params: body, actions, fallback_text, template_data
  │     Assembles AdaptiveCard JSON + marker embedding
  │
  ├── Transport Layer (lines 94-113)
  │     In-band marker embedding in tool result text
  │     Fallback text → blank line → card markers → template data markers
  │     Returns structured data in details field for typed access
  │
  ├── Fallback Generation (lines 179-260)
  │     Recursive tree walker: card body → plain text
  │     TextBlock, RichTextBlock, FactSet, ColumnSet, Container,
  │     Image, Table, Input.* all handled
  │
  └── Test Command (lines 119-171)
        /acard test — canned card for QA
        /acard {json} — custom card JSON
```

### Design Decisions

| Decision | Why |
|---|---|
| **HTML comment markers** | Travel inside existing tool result text. No gateway schema changes, no new API surfaces. Gateway sanitization only truncates — never strips comments. |
| **Stateless plugin** | No config, no database, no state. Registers a tool and a command — zero operational overhead. |
| **Client-side parsing** | Each client independently decides whether to parse markers. Clients adopt at their own pace with no coordination. |
| **AC v1.5 (not v1.6)** | Highest version with full support across Teams-AdaptiveCards-Mobile, Bot Framework, and JS SDK. |
| **Auto-fallback generation** | Reduces agent prompt complexity. Recursive extractor handles all common elements so agent focuses on card authoring. |
| **Template data separation** | Enables client-side binding without server roundtrips. Card body uses `${expression}` syntax; data travels in a separate marker. |

## How It Works

The plugin registers an `adaptive_card` tool that the AI agent calls when structured content is appropriate (status dashboards, option selections, forms, data tables).

The tool embeds Adaptive Card JSON between HTML comment markers in the tool result text. Mobile apps extract the JSON between markers and render natively. Non-card channels show only the fallback text (markers are invisible HTML comments). The gateway is completely unaware of cards.

## Usage

### AI Tool

The agent calls the `adaptive_card` tool automatically when structured content benefits from visual layout:

```json
{
  "body": [
    { "type": "TextBlock", "text": "Project Status", "weight": "Bolder" },
    { "type": "FactSet", "facts": [
      { "title": "Deploy API", "value": "Done" },
      { "title": "Write tests", "value": "In Progress" }
    ]}
  ],
  "actions": [
    { "type": "Action.Submit", "title": "Mark Complete", "data": { "task": "tests" } }
  ]
}
```

### Tool Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `body` | `unknown[]` | Yes | Array of AC v1.5 body elements (TextBlock, FactSet, ColumnSet, Table, Input.*, etc.) |
| `actions` | `unknown[]` | No | Array of card actions (Action.Submit, Action.OpenUrl, Action.ShowCard) |
| `fallback_text` | `string` | No | Plain text for non-card channels. Auto-generated if omitted. |
| `template_data` | `unknown` | No | Data context for client-side `${expression}` expansion. |

### Test Command

```
/acard test          — Send a test card to verify rendering
/acard {"type":...}  — Send custom card JSON
```

## Supported Elements

### Body Elements

| Element | Fallback Text | Notes |
|---|---|---|
| TextBlock | `.text` | Bold/subtle preserved in fallback |
| RichTextBlock | `.inlines[]` TextRun concatenation | Handles both string and TextRun inlines |
| FactSet | `title: value` per fact | One line per fact |
| ColumnSet | Recurse into `.columns[].items` | Flattened in fallback |
| Container | Recurse into `.items` | Flattened in fallback |
| Image | `[Image: altText]` | Only if `altText` provided |
| Table | Recurse cells, join with `\|` | Row-by-row extraction |
| Input.* | `.label` or `[placeholder]` | Input.Text, Input.Number, Input.Date, etc. |

### Actions

| Action | Supported |
|---|---|
| Action.Submit | Yes — triggers callback with `data` payload |
| Action.OpenUrl | Yes — opens URL in browser |
| Action.ShowCard | Yes — nested card (rendering depends on client) |

## Configuration

No configuration needed — the plugin is stateless.

## Origin

This plugin was extracted from [openclaw/openclaw#33486](https://github.com/openclaw/openclaw/pull/33486) (*Extensions: add adaptive-cards extension for native GenUI*) at the maintainers' request to be published as a standalone third-party plugin.

## Related

- [Adaptive Cards v1.5 Schema Explorer](https://adaptivecards.io/explorer/)
- [Teams-AdaptiveCards-Mobile](https://github.com/microsoft/Teams-AdaptiveCards-Mobile) — MIT-licensed native renderers for iOS (SwiftUI) and Android (Jetpack Compose)
- [adaptivecards npm package](https://www.npmjs.com/package/adaptivecards) — JavaScript SDK for web rendering

## License

MIT
