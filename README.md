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

## How It Works

The plugin registers an `adaptive_card` tool that the AI agent calls when structured content is appropriate (status dashboards, option selections, forms, data tables).

The tool embeds Adaptive Card JSON between HTML comment markers in the tool result text:

```
Here are your 3 tasks: Deploy API (done), Write tests (in progress).

<!--adaptive-card-->{"type":"AdaptiveCard","version":"1.5","body":[...]}<!--/adaptive-card-->
```

- Mobile apps extract the JSON between markers and render natively
- Non-card channels show only the fallback text (markers are invisible HTML comments)
- The gateway is completely unaware of cards — no schema changes needed

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

### Test Command

```
/acard test          — Send a test card to verify rendering
/acard {"type":...}  — Send custom card JSON
```

## Supported Elements

| Element | Fallback Text |
|---|---|
| TextBlock | `.text` |
| RichTextBlock | `.inlines[]` TextRun concatenation |
| FactSet | `title: value` per fact |
| ColumnSet / Container | Recurse into children |
| Image | `[Image: altText]` |
| Table | Recurse cells, join with `\|` |
| Input.* | `.label` or `[placeholder]` |

## Configuration

No configuration needed — the plugin is stateless.

## License

MIT
