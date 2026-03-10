# Changelog

## 1.0.0

Initial release.

### Features

- `adaptive_card` AI tool — agent calls this to emit native Adaptive Cards (v1.5)
- Marker-based transport — card JSON embedded in HTML comment markers inside tool result text
- Auto-fallback text generation — recursive extraction from TextBlock, RichTextBlock, FactSet, ColumnSet, Container, Image, Table, and Input elements
- `/acard` test command — send canned or custom card JSON for QA
- Template data support — client-side `${expression}` expansion via separate data marker
- Stateless plugin — zero configuration needed
