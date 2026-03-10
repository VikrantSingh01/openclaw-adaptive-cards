# Changelog

## 2.0.0

### Features

- **Agent intelligence:** `before_prompt_build` hook injects card usage guidance into the system prompt based on channel capability (native/translated/fallback)
- **Channel-aware decisions:** Agent automatically adapts card usage — full cards on iOS/Android/Web, simple cards on Telegram/Slack/Discord, plain text on unsupported channels
- **Richer tool description:** Embedded common card patterns (status dashboard, choice picker, data table, progress tracker, comparison layout)
- **Action routing:** `adaptive_cards.action` gateway method for Action.Submit button tap routing from clients back to the agent
- **Card validation:** `/acard validate <json>` command to validate card JSON structure
- **Card templates skill:** `skills/adaptive-cards.md` with 7 ready-to-use card templates (status, choices, table, progress, comparison, form, image+actions)
- **Prompt guidance module:** Exported `buildCardPromptGuidance()` and `formatActionAsMessage()` for advanced consumers

### Breaking Changes

- Plugin now registers a `before_prompt_build` hook (requires OpenClaw to support prompt injection hooks for full functionality; degrades gracefully if not available)

## 1.0.0

Initial release.

### Features

- `adaptive_card` AI tool — agent calls this to emit native Adaptive Cards (v1.5)
- Marker-based transport — card JSON embedded in HTML comment markers inside tool result text
- Auto-fallback text generation — recursive extraction from TextBlock, RichTextBlock, FactSet, ColumnSet, Container, Image, Table, and Input elements
- `/acard` test command — send canned or custom card JSON for QA
- Template data support — client-side `${expression}` expansion via separate data marker
- Stateless plugin — zero configuration needed
