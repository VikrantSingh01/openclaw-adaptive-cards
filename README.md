# openclaw-adaptive-cards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Adaptive Cards](https://img.shields.io/badge/Adaptive%20Cards-v1.6-blue.svg)](https://adaptivecards.io/)
[![CI](https://github.com/VikrantSingh01/openclaw-adaptive-cards/actions/workflows/ci.yml/badge.svg)](https://github.com/VikrantSingh01/openclaw-adaptive-cards/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Tests-86%20passing-brightgreen.svg)]()
[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-plugin-purple.svg)](https://openclaw.ai)
[![npm](https://img.shields.io/npm/v/@vikrantsingh01/openclaw-adaptive-cards.svg)](https://www.npmjs.com/package/@vikrantsingh01/openclaw-adaptive-cards)
[![GitHub stars](https://img.shields.io/github/stars/VikrantSingh01/openclaw-adaptive-cards.svg?style=social)](https://github.com/VikrantSingh01/openclaw-adaptive-cards)

Adaptive Cards plugin for [OpenClaw](https://openclaw.ai) — gives the AI an `adaptive_card` tool to respond with native [Adaptive Cards](https://adaptivecards.io/) (v1.6) instead of plain text. Powered by [adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp) (v2.3.0) — 9 tools, 924 tests, 21 layout patterns, schema validation, host compatibility, and accessibility scoring.

> **Blog:** [Building GenUI for AI Agents: Native Adaptive Cards Without Changing the Gateway](BLOG.md)

Cards render natively on:

| Platform | Renderer | Technology |
|----------|----------|------------|
| **iOS** | [AdaptiveCards-Mobile](https://github.com/VikrantSingh01/AdaptiveCards-Mobile) | SwiftUI |
| **Android** | [AdaptiveCards-Mobile](https://github.com/VikrantSingh01/AdaptiveCards-Mobile) | Jetpack Compose |
| **Teams** | Bot Framework attachment | Native AC rendering |
| **Web** | [adaptivecards.io](https://www.npmjs.com/package/adaptivecards) | JavaScript SDK |
| **Telegram / Slack / IRC** | Auto-generated fallback text | Plain text extraction |

## Topics

[Quick Start](#quick-start) | [Ecosystem](#ecosystem) | [Architecture](#architecture) | [Usage](#usage) | [Supported Elements](#supported-elements) | [Exports](#exports) | [What's New](#whats-new-in-v410) | [Development](#development) | [Related](#related)

**Documentation:** [AGENTS.md](AGENTS.md) (AI agent guidance) | [CONTRIBUTING.md](CONTRIBUTING.md) (developer guide) | [BLOG.md](BLOG.md) (narrative deep-dive) | [CHANGELOG.md](CHANGELOG.md) (version history)

## Quick Start

```bash
openclaw plugins install @vikrantsingh01/openclaw-adaptive-cards
```

That's it — no configuration needed. The plugin registers the `adaptive_card` tool automatically.

### What happens next

1. The agent's system prompt is augmented with 21 card layout patterns and channel-aware guidance
2. When the agent decides structured content benefits from visual layout, it calls the `adaptive_card` tool
3. The card is validated against the official v1.6 JSON Schema, scored for accessibility, and adapted for the target host
4. Clients regex-extract the card JSON from HTML comment markers and render natively

## Ecosystem

This plugin is part of a larger Adaptive Cards AI toolchain:

| Package | Purpose | Repo |
|---------|---------|------|
| **openclaw-adaptive-cards** | OpenClaw plugin — card delivery, transport, fallback, action routing | This repo |
| **adaptive-cards-mcp** | MCP server + npm library — 7 AI tools for card generation, validation, optimization | [adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp) |
| **AdaptiveCards-Mobile** | Native renderers — SwiftUI (iOS) + Jetpack Compose (Android) | [AdaptiveCards-Mobile](https://github.com/VikrantSingh01/AdaptiveCards-Mobile) |

The plugin consumes `adaptive-cards-mcp` as its core engine for validation, host adaptation, accessibility checking, and layout patterns. The plugin itself is a thin delivery layer focused on OpenClaw tool registration, marker-based transport, fallback text generation, prompt injection, and action routing.

```
openclaw-adaptive-cards (this plugin — thin delivery layer)
  └── adaptive-cards-mcp (shared core — validation, host compat, accessibility, 21 patterns)
        ├── ajv (official v1.6 JSON Schema validation)
        └── zod (runtime type validation)
```

## Architecture

### High-Level Flow

```
Agent LLM
  │  decides structured content is appropriate
  ▼
adaptive_card tool executes (this plugin)
  │  assembles AdaptiveCard v1.6 JSON
  │  validates against official v1.6 schema (via adaptive-cards-mcp)
  │  checks accessibility (WCAG score 0-100)
  │  adapts for host compatibility (Teams, Outlook, Webex, etc.)
  │  generates fallback text
  │  embeds card + fallback in HTML comment markers
  ▼
Gateway passes text through unmodified
  │  no schema changes, no hooks, no middleware
  │  cards piggyback on existing ReplyPayload.text
  ▼
Client receives tool result text
  │
  ├─► iOS / Android ── regex-extract JSON ── AdaptiveCards-Mobile SDK ── native SwiftUI / Compose view
  ├─► MS Teams ─────── regex-extract JSON ── Bot Framework Attachment ──────── native Teams card
  ├─► Web UI ──────── regex-extract JSON ── adaptivecards.io JS SDK ────────── rendered in browser
  └─► Telegram / Slack / IRC ── markers invisible (HTML comments) ──────────── shows fallback text only
```

### Marker Wire Format

The tool result text contains three sections:

```
Project Status: Deploy API (done), Write tests (in progress).     ← FALLBACK TEXT (always visible)

<!--adaptive-card-->{"type":"AdaptiveCard","version":"1.6",...}<!--/adaptive-card-->     ← CARD JSON
<!--adaptive-card-data-->{"projectId":"abc123"}<!--/adaptive-card-data-->                ← TEMPLATE DATA (optional)
```

| Section | Purpose |
|---|---|
| **Fallback text** | Auto-generated or agent-provided. Visible on all channels. Non-card channels only see this. |
| **Card JSON** | Full AdaptiveCard v1.6 envelope. Clients regex between `<!--adaptive-card-->` markers. |
| **Template data** | Optional. Enables client-side `${expression}` expansion. Separated from card body for clean data binding. |

### Plugin Layers

```
src/index.ts          ← Plugin registration: tool, hook, command, gateway method, cardId + preview
src/mcp-bridge.ts     ← Bridge: 25+ functions from adaptive-cards-mcp (validation, patterns, persistence, tools)
src/prompt.ts         ← System prompt injection with 21 patterns, host matrix, accessibility guidance
src/fallback.ts       ← Recursive card body → plain text extraction (30+ v1.6 element types)
src/actions.ts        ← Action.Execute/Submit routing from client taps
src/constants.ts      ← Marker tags, AC version, defaults
```

### What the MCP Core Provides

The plugin delegates to `adaptive-cards-mcp` for:

| Capability | Description |
|---|---|
| **Schema validation** | AJV-based validation against the official 3,297-line v1.6 JSON Schema |
| **Host compatibility** | Checks cards against 7 hosts (Generic, Teams, Outlook, Web Chat, Windows, Viva, Webex) |
| **Card adaptation** | Replaces unsupported elements (Table→ColumnSet, Carousel→Container, Charts→FactSet, Action.Execute→Submit) |
| **Accessibility** | WCAG scoring (0-100) checking altText, labels, wrap, speak property |
| **Layout patterns** | 21 production-ready card templates (approval, incident, calendar, PR review, etc.) |
| **Card analysis** | Element counts, nesting depth, templating detection, duplicate ID detection |
| **Card persistence** | Session-scoped storage (30-min TTL) with cardId for subsequent optimize/validate calls |
| **Preview generation** | HTML preview file for Adaptive Cards Designer |
| **9 tool handlers** | generateCard, validateCardFull, dataToCard, optimizeCard, templateCard, transformCard, suggestLayout, generateAndValidate, cardWorkflow |

### Design Decisions

| Decision | Why |
|---|---|
| **HTML comment markers** | Travel inside existing tool result text. No gateway schema changes. Gateway sanitization only truncates — never strips comments. |
| **Stateless plugin** | No config, no database, no state. Zero operational overhead. |
| **MCP as shared core** | One source of truth for validation, host compat, and patterns. Plugin stays thin (~1,000 lines). |
| **Client-side parsing** | Each client independently decides whether to parse markers. Clients adopt at their own pace. |
| **AC v1.6** | Latest version with Carousel, CodeBlock, Charts, and full Teams support. Auto-adapted for older hosts. |
| **Action.Execute preferred** | Universal Actions enable server-side card refresh, role-based views, and Copilot compatibility. |
| **Auto-fallback generation** | Recursive extractor handles all v1.6 elements so agent focuses on card authoring. |

## Usage

### AI Tool

The agent calls the `adaptive_card` tool automatically when structured content benefits from visual layout:

```json
{
  "body": [
    { "type": "TextBlock", "text": "Expense Approval", "weight": "Bolder", "size": "Medium" },
    { "type": "FactSet", "facts": [
      { "title": "Amount", "value": "$2,450.00" },
      { "title": "Category", "value": "Travel" }
    ]}
  ],
  "actions": [
    { "type": "Action.Execute", "title": "Approve", "verb": "expense_approve", "data": { "decision": "approved" } },
    { "type": "Action.Execute", "title": "Reject", "verb": "expense_reject", "data": { "decision": "rejected" } }
  ]
}
```

### Tool Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `body` | `unknown[]` | Yes | Array of AC v1.6 body elements (TextBlock, FactSet, Table, Carousel, Chart.*, Input.*, etc.) |
| `actions` | `unknown[]` | No | Array of card actions (Action.Execute, Action.Submit, Action.OpenUrl, Action.ShowCard, Action.ToggleVisibility) |
| `fallback_text` | `string` | No | Plain text for non-card channels. Auto-generated if omitted. |
| `template_data` | `unknown` | No | Data context for client-side `${expression}` expansion. |

### Commands

```
/acard test                   — Send a test card to verify rendering
/acard validate {...}         — Validate card JSON + accessibility score
/acard compat teams {...}     — Check card compatibility with a host
/acard {...}                  — Send custom card JSON
```

### Agent Intelligence

The plugin injects channel-aware guidance into the agent's system prompt via a `before_prompt_build` hook:

| Channel | Guidance |
|---|---|
| **Native** (iOS, Android, Web, Teams) | "Prefer cards over plain text when content is structured" |
| **Translated** (Telegram, Slack, Discord) | "Keep cards simple: TextBlock, FactSet, simple actions" |
| **Fallback** (Signal, IRC, SMS) | "Only fallback text shown — prefer plain text" |

The prompt includes all 21 layout patterns from `adaptive-cards-mcp` so the agent knows what card designs are available.

## Supported Elements

### Body Elements (v1.6)

| Element | Fallback Text | Notes |
|---|---|---|
| TextBlock | `.text` | Core text element |
| RichTextBlock | `.inlines[]` concatenation | TextRun and string inlines |
| FactSet | `title: value` per fact | Key-value pairs |
| ColumnSet | Recurse into `.columns[].items` | Flattened in fallback |
| Container | Recurse into `.items` | Flattened in fallback |
| Image | `[Image: altText]` | Only if `altText` provided |
| ImageSet | `[Image: altText]` per image | Gallery |
| Table | Recurse cells, join with `\|` | Row-by-row extraction |
| CodeBlock | Fenced code block | `codeSnippet` as ``` block |
| Carousel | Recurse `.pages[].items` | Page-by-page extraction |
| Accordion | `.title` + recurse card body | Section titles + content |
| TabSet | `[tabTitle]` + recurse card body | Tab labels + content |
| Chart.* | `title` + `label: value` per data point | Bar, Line, Pie, Donut |
| Rating | `★★★☆☆` stars | Visual star rating |
| ProgressBar | Label or percentage | Progress indicator |
| CompoundButton | `.title` + `.description` | Rich button |
| Badge | `[text]` | Status badge |
| Input.* | `.label` or `[placeholder]` | All input types |

### Actions

| Action | Description |
|---|---|
| **Action.Execute** | Server-side processing with automatic card refresh (preferred) |
| **Action.Submit** | Client-side data submission (legacy, widely supported) |
| **Action.OpenUrl** | Opens URL in browser |
| **Action.ShowCard** | Reveals nested card inline |
| **Action.ToggleVisibility** | Shows/hides elements by targetElementId |

## Exports

The plugin re-exports key functions from `adaptive-cards-mcp` for advanced consumers:

```typescript
import {
  // Plugin-specific
  generateFallbackText,
  buildCardPromptGuidance,
  formatActionAsMessage,
  CARD_OPEN_TAG, CARD_CLOSE_TAG,

  // MCP-powered core (via bridge)
  validateCard,
  checkHostCompatibility,
  adaptCardForHost,
  checkCardAccessibility,
  analyzeCard,
  findDuplicateIds,
  getValidElementTypes,
  getValidActionTypes,

  // Patterns & hosts
  getAllPatterns,
  scorePatterns,
  findPatternByName,
  findPatternByIntent,
  getAllHostSupport,
  getHostSupport,

  // Card persistence & preview
  storeCard,
  getCard,
  listCards,
  writePreviewFile,

  // High-level MCP tool handlers
  generateCard,
  validateCardFull,
  optimizeCard,
  dataToCard,
  suggestLayout,
} from "@vikrantsingh01/openclaw-adaptive-cards";
```

## Configuration

No configuration needed — the plugin is stateless.

## What's New in v4.1.0

- **Card persistence** — `storeCard()` / `getCard()` / `listCards()` with session-scoped 30-min TTL
- **Preview generation** — `writePreviewFile()` generates HTML preview for Adaptive Cards Designer
- **Duplicate ID detection** — `findDuplicateIds()` catches broken Action.ToggleVisibility targets
- **Pattern scoring** — `scorePatterns()` ranks all 21 patterns against natural language descriptions
- **High-level tool handlers** — `generateCard()`, `validateCardFull()`, `optimizeCard()`, `dataToCard()`, `suggestLayout()`
- **Full sync** with adaptive-cards-mcp v2.3.0 (9 tools, 924 tests, 36 examples)

See [CHANGELOG.md](CHANGELOG.md) for full version history.

## Development

```bash
# Clone and install
git clone https://github.com/VikrantSingh01/openclaw-adaptive-cards.git
cd openclaw-adaptive-cards && npm install

# Run tests
npm test

# Type check
npm run typecheck

# Full check (typecheck + test)
npm run check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details, testing guidelines, and PR checklist.

## Origin

This plugin was extracted from [openclaw/openclaw#33486](https://github.com/openclaw/openclaw/pull/33486) (*Extensions: add adaptive-cards extension for native GenUI*) at the maintainers' request to be published as a standalone third-party plugin.

Community plugins listing PR: [openclaw/openclaw#41735](https://github.com/openclaw/openclaw/pull/41735)

## Related

- [adaptive-cards-mcp](https://github.com/VikrantSingh01/adaptive-cards-mcp) — MCP server + npm library powering this plugin's validation, host compat, and patterns
- [AdaptiveCards-Mobile](https://github.com/VikrantSingh01/AdaptiveCards-Mobile) — Native renderers for iOS (SwiftUI) and Android (Jetpack Compose)
- [Adaptive Cards v1.6 Schema Explorer](https://adaptivecards.io/explorer/)
- [adaptivecards npm package](https://www.npmjs.com/package/adaptivecards) — JavaScript SDK for web rendering
- [Blog: Building GenUI for AI Agents with Adaptive Cards](https://singhvikrant.substack.com/p/i-built-an-mcp-server-that-makes)

## License

MIT
