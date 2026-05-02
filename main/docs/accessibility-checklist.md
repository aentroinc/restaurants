# AENTRO Restaurant OS — Accessibility Checklist (WCAG 2.1 AA)

Scope: 3 PWA apps (`/staff`, `/manager`, `/sv`).
Updated: 2026-05-02

| WCAG | Criterion | Status | Where |
|------|-----------|--------|-------|
| 1.1.1 | Non-text content (alt) | OK | All decorative `lucide-react` icons use `aria-hidden="true"`; iconography paired with text labels in tabs/headers |
| 1.3.1 | Info and relationships | OK | Semantic `<header role="banner">`, `<nav aria-label>`, `<main id="main" role="main">`, `aria-current="page"` on active tabs |
| 1.3.5 | Identify input purpose | Partial | Form fields in staff/manager use `name`/`type` correctly; `autocomplete` to be audited per form |
| 1.4.3 | Contrast (Minimum) | OK | `--muted-foreground` raised to 72% L (≥ 4.5:1 vs #0a0e14); body uses 85% white |
| 1.4.4 | Resize text 200% | OK | All sizes in rem/em or fluid utility classes |
| 1.4.10 | Reflow | OK | No horizontal scroll at 320 CSS px (responsive grid) |
| 1.4.11 | Non-text contrast | OK | Borders/icons at ≥ 3:1 |
| 1.4.13 | Content on hover/focus | OK | Tooltips dismissable; nothing time-limited |
| 2.1.1 | Keyboard | OK | All routes via `<a>` / `<button>`; SV drawer trap planned via Esc handler |
| 2.1.2 | No keyboard trap | OK | Drawers/modals close on Esc and overlay click |
| 2.4.1 | Bypass blocks | OK | `<SkipLink>` jumps to `#main` in every app layout |
| 2.4.3 | Focus order | OK | DOM order matches visual order |
| 2.4.4 | Link purpose | OK | All icon-only links/buttons carry `aria-label` |
| 2.4.6 | Headings & labels | OK | Each page has a `h1` (page title); section headings use `h2`/`h3` in order |
| 2.4.7 | Focus visible | OK | Global `:focus-visible` ring (2px blue + 2px offset) in `globals.css` |
| 2.5.3 | Label in name | OK | Visible label text matches accessible name |
| 2.5.5 | Target size (AA) | OK | Tab targets ≥ 44×44 (`min-h-[64px]` on staff bottom nav) |
| 3.1.1 | Language of page | OK | `<html lang="ja">` set in root layout |
| 3.2.3 | Consistent navigation | OK | Per-role nav identical across pages of that role |
| 3.3.1 | Error identification | OK | `<AppErrorBoundary>` per app, `role="alert"` |
| 4.1.2 | Name, role, value | OK | ARIA on dialogs (`aria-modal`, `aria-label`), live regions (`role="status"`, `aria-live`) for connectivity |
| 4.1.3 | Status messages | OK | Online/offline + sync count announced via `aria-live="polite"` |

## Testing
- Automated: `npm run lighthouse` (target `accessibility >= 95`).
- Manual:
  - macOS VoiceOver (Cmd+F5) — tab through all 3 apps.
  - Keyboard-only — verify focus ring visible everywhere.
  - 200% zoom — no clipped content.
  - `prefers-reduced-motion` — animations short-circuited.

## Known gaps / TODO
- Audit remaining icon-only buttons in deep-feature pages (`waste`, `complaint`, `equipment`, `coaching`, etc.) for `aria-label`.
- Translate live region announcements for offline/online to verbose Japanese (currently short).
- Add `lang` attribute on individual English fragments where needed.
