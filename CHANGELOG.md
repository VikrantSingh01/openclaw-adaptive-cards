# Changelog

## 4.0.0

### Architecture: MCP Server as Shared Core

The plugin now consumes `adaptive-cards-mcp` (v2.0.0) as its validation, host compatibility, accessibility, and layout pattern engine. This eliminates ~520 lines of duplicate logic and replaces lightweight local implementations with the MCP server's production-grade modules:

- **Schema validation:** Local type-checking replaced with the MCP's AJV-based validator using the official 3,297-line Adaptive Cards v1.6 JSON Schema
- **Host compatibility:** Local 6-host support map replaced with the MCP's comprehensive host adaptation engine (Table→ColumnSet, Carousel→Container, Charts→FactSet, Action.Execute↔Submit, version downgrade, action trimming)
- **Accessibility checking:** New — cards now receive an accessibility score (0-100) with specific WCAG issues (missing altText, labels, wrap, speak property)
- **Layout patterns:** Static 11 hardcoded patterns replaced with 21 dynamic patterns from the MCP library (including flight-status, order-confirmation, weather, calendar-event, pull-request, incident-alert, survey-poll, wizard-step, pricing-table, timeline-activity)
- **Card analysis:** New `analyzeCard()` function provides element counts, nesting depth, templating detection, and element/action type breakdowns

### Features

- **Accessibility scoring on every card emission:** Tool result details now include `accessibility: { score, issues }` from the MCP's WCAG checker
- **Richer validation:** Full JSON Schema validation catches structural issues the lightweight validator missed
- **21 layout patterns in prompt guidance:** Agent now sees all MCP patterns (up from 11 hardcoded), enabling better card design decisions
- **`/acard validate` shows accessibility score** alongside structural validation
- **Bridge adapter architecture:** New `src/mcp-bridge.ts` provides a clean API translation layer — plugin functions accept `body[] + actions[]` while internally delegating to MCP functions that operate on full card envelopes

### Breaking Changes

- Removed `./validate` and `./host-compat` sub-path exports from `package.json` — consumers should import from the main entry or use `adaptive-cards-mcp` directly
- `adaptive-cards-mcp` is now a required dependency (adds ajv + zod as transitive deps)
- Validation may reject cards that previously passed (the AJV validator is stricter than the local implementation)
- `adaptCardForHost()` now returns `{ body, actions, changes[], warnings[] }` (added `changes` and `warnings` from MCP)

### New Exports

- `checkCardAccessibility(body, actions?)` — Returns `{ score: number, issues: string[] }`
- `analyzeCard(body, actions?)` — Returns full `CardStats` from MCP
- `getAllPatterns()` — Returns all 21 layout patterns from MCP
- Re-exported MCP types: `HostApp`, `ValidationError`, `AccessibilityReport`, `HostCompatibilityReport`, `LayoutPattern`, `CardStats`

### Removed

- `src/validate.ts` — Replaced by MCP bridge to `adaptive-cards-mcp`
- `src/host-compat.ts` — Replaced by MCP bridge to `adaptive-cards-mcp`
- `getKnownElementTypes()` / `getKnownActionTypes()` — Use `getValidElementTypes()` / `getValidActionTypes()` (re-exported from MCP)

## 3.0.0

### Features

- **Adaptive Cards v1.6:** Upgraded from v1.5 to v1.6, unlocking Carousel, CodeBlock, Accordion, TabSet, Charts, Rating, ProgressBar, Badge, Icon, CompoundButton, and Table improvements
- **Universal Actions (Action.Execute):** Full support for server-side card processing with automatic refresh, verb-based routing, and role-based views
- **Action.ToggleVisibility:** Show/hide elements by targetElementId
- **Schema validation at card emission:** Validates element types, action types, structural integrity, and best practices before cards reach the transport layer
- **Host compatibility checking:** Checks cards against 6 host targets and automatically adapts for compatibility
- **v1.6 fallback text generation:** Fallback extraction for Carousel, CodeBlock, Accordion, TabSet, Charts, Rating, ProgressBar, CompoundButton, Badge, ImageSet
- **Enterprise card templates:** Approval Workflow, Incident Alert, Calendar Event, Profile Card, Pull Request Review
- **Structured details output:** Tool result `details.adaptiveCard` carries parsed card object plus validation and adaptation metadata

## 2.0.0

### Features

- **Agent intelligence:** `before_prompt_build` hook injects card usage guidance based on channel capability
- **Channel-aware decisions:** Full cards on iOS/Android/Web, simple cards on Telegram/Slack/Discord, plain text on unsupported channels
- **Action routing:** `adaptive_cards.action` gateway method for Action.Submit button tap routing
- **Card templates skill:** 7 ready-to-use card templates
- **Prompt guidance module:** Exported `buildCardPromptGuidance()` and `formatActionAsMessage()`

## 1.0.0

Initial release.

### Features

- `adaptive_card` AI tool — agent calls this to emit native Adaptive Cards
- Marker-based transport — card JSON embedded in HTML comment markers
- Auto-fallback text generation — recursive extraction from card elements
- `/acard` test command — send canned or custom card JSON for QA
- Template data support — client-side `${expression}` expansion
- Stateless plugin — zero configuration needed
