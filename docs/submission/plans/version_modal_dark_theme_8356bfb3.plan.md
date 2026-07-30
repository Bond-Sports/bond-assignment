---
name: Version modal dark theme
overview: Apply the specified dark palette to both version modals (Create + Edit) by extending scoped SCSS on `.version-dropdown-modal`, with companion text and control overrides so inputs and typography stay readable on `#1A1A1A`.
todos:
  - id: scss-modal-shell
    content: "Add `.break-modal-container.version-dropdown-modal` block: #1A1A1A shell, title/label/close/footer divider overrides, light typography"
    status: completed
  - id: scss-inputs-radio-dropdown
    content: "Scope input/textarea (#313131), radio box unchecked/checked (#313131 / #242231 + #8169FF), react-select control/menu overrides"
    status: completed
  - id: scss-footer-buttons
    content: "Footer: outline → #313131 fill + white text; primary → white fill + dark text"
    status: completed
  - id: tsx-separator
    content: Add `showTitleSeparator` to CreateVersionModal and EditVersionModal Modal props; tune separator border in SCSS
    status: completed
isProject: false
---

# Dark styling for version modals

## Context

- Modals use `[libs/break/src/lib/Modal/Modal.tsx](libs/break/src/lib/Modal/Modal.tsx)`: `className` is merged onto the root as `break-modal-container ...`, so both `[CreateVersionModal.tsx](apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx)` and `[EditVersionModal.tsx](apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)` already share `**version-dropdown-modal**` on that root (confirmed).
- Shared styles live in `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)` (imported from `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`).
- **Radio “box”** appearance is defined in `[libs/break/src/lib/Radio/styles.scss](libs/break/src/lib/Radio/styles.scss)` (`.radio.box`, `.radio.box.checked`) — override inside the modal scope only; do not change the library default.
- **Inputs** use `.break-input-container` / `.input-block` with `background-color: var(--input-bg)` (`[Input/styles.scss](libs/break/src/lib/Input/styles.scss)`). Set `--input-bg` / `--input-bg-hover` on the modal root (or override `.input-block` directly) so fields match `#313131` without editing break.
- **Textareas** use `.break-textarea` with `background-color: $white` (`[AutoHeightTextarea/styles.scss](libs/break/src/lib/AutoHeightTextarea/styles.scss)`) — override under `.version-dropdown-modal`.
- **Source dropdown** uses `classNamePrefix="dropdown"`; operator globals in `[apps/operator/src/styles/index.scss](apps/operator/src/styles/index.scss)` style `.dropdown__control`. React-select also applies inline styles; where needed, use **scoped selectors + `!important`** only on properties that lose to inline (typically `background-color` on the control), matching patterns used elsewhere in the repo (e.g. AAC form field SCSS).

## Implementation (single file + tiny optional Modal prop)

### 1. Extend `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)`

Nest everything under `**.break-modal-container.version-dropdown-modal**` (or equivalent specificity) so only these modals change.

| Area                            | Rules                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shell**                       | `background-color: #1A1A1A`; keep existing `border-radius` from break; optional subtle shadow adjustment if the default light-modal shadow looks wrong on dark.                                                                                                                                                                                                                                   |
| **Typography**                  | Override `.modal-title`, `.break-input-container .label`, `.break-textarea-container` labels, and `.version-dropdown-modal__label` to **light text** (`#fff` / muted gray for descriptions). Default `$neutral_100` is `#0A0A0A` (`[variables.scss](libs/break/src/styles/variables.scss)`), which is unreadable on dark surfaces.                                                                |
| **Dividers (match reference)**  | Enable `showTitleSeparator` on both modals (see step 2), then override `.modal-title.title-separator` **border-color** to a dark-theme line (e.g. `rgba(255,255,255,0.08)`). Optionally add a **top border** on `.modal-footer` for the same separation as the mock.                                                                                                                              |
| **Close control**               | Tweak `.modal-close-icon:hover` so hover isn’t a light gray blob on `#1A1A1A` (e.g. semi-transparent white).                                                                                                                                                                                                                                                                                      |
| **Inputs / textarea**           | `--input-bg: #313131`; `--input-bg-hover: #313131` or a slightly lighter hex for hover; force `input` / `textarea` **color** and **placeholder** to light grays; align **focus** border with the purple accent or a neutral light border so focus is visible.                                                                                                                                     |
| **Radio cards**                 | Under `.version-dropdown-modal`: `.radio.box` — **unchecked**: `background: #313131`, neutral border (use a **fixed 2px border** with transparent or dark color on unchecked so checked state doesn’t shift layout). **Checked**: `background: #242231`, `border-color: #8169FF` (2px). Override `.radio-label` / `.radio-description` colors for dark background.                                |
| **Dropdown (Create flow)**      | Scope under `.version-dropdown-modal__source-dropdown` or the modal root: `.dropdown__control` / focused state → `#313131` background, light single-value text, chevron stroke; `.dropdown__menu` + options to a dark menu (inline styles from `[dropdownUtils.tsx](libs/break/src/lib/Dropdown/utils/dropdownUtils.tsx)` use white/neutral vars — override with `!important` where inline wins). |
| **Footer actions (match mock)** | **Cancel**: background `#313131`, white text, border none or subtle. **Primary** (“Create Draft” / “Save”): **white background**, **dark text** (`#0A0A0A`) — inverse of break’s default `.primary` (`[Button/styles.scss](libs/break/src/lib/Button/styles.scss)`). Target `.modal-footer .break-button` with variants `outline` and `primary`.                                                  |

### 2. Optional one-line TSX tweak in both modals

- Set `**showTitleSeparator` on `[Modal](apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx)` and `[Modal](apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)` so the header/body divider exists; style that separator in SCSS as above.

## Validation

- Open Create Version: starting-point radios, clone dropdown (menu + control), inputs, textarea, footer buttons.
- Open Edit Version: same shell/inputs/textarea/buttons (no radios/dropdown).
- Keyboard: focus rings still visible on dark controls.

## Out of scope

- Changing break library defaults for `Modal`, `Radio`, `Input`, or `Dropdown` globally — all changes stay under operator VersionDropdown SCSS (and optional `showTitleSeparator` props).
