# Contributing to openclaw-adaptive-cards

Thank you for your interest in contributing! This guide covers development setup, architecture, testing, and pull request guidelines.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/VikrantSingh01/openclaw-adaptive-cards.git
cd openclaw-adaptive-cards

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Full check (typecheck + tests)
npm run check
```

### Prerequisites

- Node.js 22+
- TypeScript 5.9+
- The `adaptive-cards-mcp` package linked locally (see `package.json` dependency)

## Architecture Overview

```
src/
├── index.ts          # Plugin registration: tool, hook, command, gateway method, cardId + preview
├── mcp-bridge.ts     # Bridge adapter: 25+ functions from adaptive-cards-mcp core
├── prompt.ts         # System prompt injection: 21 patterns, host matrix, accessibility guidance
├── fallback.ts       # Recursive card body → plain text extraction (30+ v1.6 element types)
├── actions.ts        # Action.Execute/Submit routing from client taps
├── constants.ts      # Marker tags, AC version, defaults
tests/
├── fallback.test.ts  # Fallback text generation for all element types
├── prompt.test.ts    # Prompt guidance generation and channel awareness
├── actions.test.ts   # Action routing and formatting
├── bridge.test.ts    # MCP bridge adapter functions
└── constants.test.ts # Marker tags and version constants
```

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Thin delivery layer** | Plugin is ~1,000 lines. All validation, patterns, and host compat live in `adaptive-cards-mcp` |
| **Stateless** | No config, no database, no state. Zero operational overhead |
| **MCP as shared core** | One source of truth for card intelligence. Plugin delegates via `mcp-bridge.ts` |
| **Client-side parsing** | Each client independently decides whether to parse markers |
| **Auto-fallback** | Every card produces readable plain text for non-card channels |

### Key Integration Points

- **`src/index.ts`** — Registers the `adaptive_card` tool with OpenClaw, handles `/acard` commands, injects prompt guidance via `before_prompt_build` hook, exposes `adaptive_cards.action` gateway method
- **`src/mcp-bridge.ts`** — Translates between plugin's `body[] + actions[]` interface and the MCP's full card envelope interface. All MCP core access goes through here.
- **`src/fallback.ts`** — Recursive extractor that handles 30+ v1.6 element types. Critical for non-card channels.

## Adding a New Feature

1. Identify which module the feature belongs to (see architecture above)
2. Implement the feature in the appropriate `src/` file
3. Add tests in the corresponding `tests/` file
4. Update exports in `src/index.ts` if the feature is public
5. Run `npm run check` to verify everything passes
6. Update the README if the feature adds new user-facing functionality

## Testing Guidelines

- All modules must have unit tests
- Use vitest's `describe`/`it`/`expect` (globals enabled)
- Test both success and error paths
- Test edge cases: empty inputs, nested elements, malformed card JSON
- **Async code**: Use `async/await` in tests
- **Mocking**: Use `vi.spyOn()` for system calls, `vi.fn()` for custom mocks
- Current coverage: 86 tests across 5 test files

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx vitest run tests/fallback.test.ts
```

## Pull Request Checklist

- [ ] All existing tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Commit messages follow conventional format (`feat:`, `fix:`, `docs:`, `chore:`)
- [ ] README updated if user-facing behavior changes
- [ ] CHANGELOG updated for notable changes

## Code Style

- TypeScript strict mode
- 2-space indentation
- Double quotes for strings
- Trailing commas
- No unused variables (prefixed with `_` if intentionally unused)
- Prefer `const` over `let`
- No `any` except in tool handler argument parsing

## Reporting Issues

Use [GitHub Issues](https://github.com/VikrantSingh01/openclaw-adaptive-cards/issues) to report bugs or request features.
