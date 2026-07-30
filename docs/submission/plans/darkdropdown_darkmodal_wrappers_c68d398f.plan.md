---
name: DarkDropdown DarkModal wrappers
overview: Add `DarkDropdown` and `DarkModal` in `libs/break` that wrap the existing components with dark tokens, fix `Dropdown` style merge order so overrides work without `!important`, then switch the operator version feature to these wrappers and delete the heavy `!important` SCSS from `VersionDropdown/styles.scss`.
todos:
  - id: dropdown-merge-order
    content: "Refactor Dropdown mergedStyles: standard styles first, then consumer props.styles; preserve control/menuPortal composition"
    status: cancelled
  - id: dark-styles-helper
    content: Add getDarkDropdownStyles() in break Dropdown utils for menu/option (and related) inline dark tokens
    status: completed
  - id: dark-dropdown-component
    content: Add DarkDropdown.tsx + dark-dropdown.scss, export from @aui/break
    status: completed
  - id: dark-modal-component
    content: Add DarkModal.tsx + dark-modal.scss (move rules from operator), export from @aui/break
    status: completed
  - id: operator-migrate
    content: VersionDropdown/CreateVersionModal/EditVersionModal use DarkDropdown/DarkModal; slim VersionDropdown/styles.scss
    status: completed
isProject: false
---

# DarkDropdown + DarkModal for the version feature

## Problem

- `[libs/break/src/lib/Dropdown/Dropdown.tsx](libs/break/src/lib/Dropdown/Dropdown.tsx)` builds `mergedStyles` with `**props.styles` first**, then `**getStandardMenuStyles()`** (`[dropdownUtils.tsx](libs/break/src/lib/Dropdown/utils/dropdownUtils.tsx)`). That means **standard `menu`/`option`inline colors always win**, which forced operator`[VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)`to rely on`**!important`** and fragile overrides (including fighting Break’s `[.break-dropdown-menu__options [class*="__option--is-selected"]](libs/break/src/lib/Dropdown/styles.scss)` `$neutral_30`).
- Modals already support a root `className` on `break-modal-container` (`[Modal.tsx](libs/break/src/lib/Modal/Modal.tsx)`); a dedicated `**dark-modal`** class + SCSS can replace most modal `!important` blocks with **higher-specificity selectors (no Emotion hash targeting).

## 1. Fix Dropdown style merge order (required for DarkDropdown)

In `[Dropdown.tsx](libs/break/src/lib/Dropdown/Dropdown.tsx)` `mergedStyles` `useMemo`:

- Apply **in order**: `getLineClampStyles()` (if enabled), `getStandardMenuStyles()` (if standard menu), `getInputHiddenStylesWhenMenuSearch()`, then **spread a de-structured `props.styles`** so `**menu`, `option`, `menuList`, etc. from the consumer override standard.
- **Do not** blindly spread `props.styles` last for every key: keep explicit `**control`** composition (consumer `styles.control` then existing `menuOpenControlWidth` logic) and `**menuPortal\*\*`composition (existing`scaleMenuStyles`/ header-safe-top, optionally chaining consumer`styles.menuPortal` if present).

**Regression risk:** Grep shows **no** operator/Break `Dropdown` usages passing `styles={{...}}` today (AAC table filter uses raw `react-select`). Risk is low; any future consumer benefits from predictable overrides.

## 2. Add dark menu inline styles helper

In `[libs/break/src/lib/Dropdown/utils/dropdownUtils.tsx](libs/break/src/lib/Dropdown/utils/dropdownUtils.tsx)` (or a sibling `darkDropdownStyles.ts`):

- Export `**getDarkDropdownStyles(): StylesConfig`** (or partial) that mirrors the shape of `getStandardMenuStyles()` for `**menu`**, `**option`**, and any other keys that currently force light colors (e.g. selected background not `var(--neutral_30)`/`#EDEDED`, text light on `#121212`, `maxWidth`/`minWidth` if you want the version menu width policy in one place).

This removes the need to fight inline white/`neutral_30` from SCSS.

## 3. `DarkDropdown` component (break)

- New files under `[libs/break/src/lib/Dropdown/](libs/break/src/lib/Dropdown/)` (or `DarkDropdown/` + barrel):
  - `**DarkDropdown.tsx`: `import './dark-dropdown.scss'`, render `<Dropdown {...props} className={classNames('dark-dropdown', props.className)} styles={{ ...getDarkDropdownStyles(), ...props.styles }} />` so callers can still pass `styles` for edge cases.
  - `**dark-dropdown.scss`**: Scope to `**.dark-dropdown`**(and`.dropdown-container`if needed) for what **cannot** be expressed via`styles`alone—e.g. Break layout SCSS for`[.break-dropdown-menu\_\_header](libs/break/src/lib/Dropdown/styles.scss)`, `[.break-dropdown-menu\_\_footer](libs/break/src/lib/Dropdown/styles.scss)`, [option hover `$neutral_20](libs/break/src/lib/Dropdown/styles.scss)`, scrollbar, footer `ghost-dark`text. Prefer **normal specificity (no`!important`) now that menu/option surfaces are dark via inline styles; use `!important` only if a remaining rule is still inline or unavoidable.
- Export `**DarkDropdown` from `[libs/break/src/index.ts](libs/break/src/index.ts)`.

## 4. `DarkModal` component (break)

- New files under `[libs/break/src/lib/Modal/](libs/break/src/lib/Modal/)`:
  - `**DarkModal.tsx`**: `import './dark-modal.scss'`, render `<Modal {...props} className={classNames('dark-modal', props.className)} />`, re-export `**Modal.Title`/`Modal.Content`/`Modal.Footer\*\*`from the same underlying`Modal`(attach subcomponents to`DarkModal`like`Modal`).
  - `**dark-modal.scss`**: Move the behavioral/theming rules currently under `**.break-modal-container.version-dropdown-modal`**in operator into`**.break-modal-container.dark-modal`**(shell`#1A1A1A`, inputs `#313131`, transparent input focus vs `$neutral_10`, textarea, radios, modal dropdown, footer buttons, title separator, close icon). Use compound selectors to beat Break defaults where possible; reserve `!important` only for true inline wars (e.g. react-select in modal).
- Export `**DarkModal` from `[libs/break/src/index.ts](libs/break/src/index.ts)`.

## 5. Wire operator version feature

- `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`: import `**DarkDropdown`** instead of `**Dropdown\*\`; remove redundant `classNames.menu`hacks if`getDarkDropdownStyles` + SCSS cover the same surface (or keep a single stable BEM class if still useful).
- `[CreateVersionModal.tsx](apps/operator/src/components/VersionDropdown/partial/CreateVersionModal.tsx)` and `[EditVersionModal.tsx](apps/operator/src/components/VersionDropdown/partial/EditVersionModal.tsx)`: import `**DarkModal`**, use `**className="version-dropdown-modal"`**only if you still need BEM children; otherwise prefer`**dark-modal\*\` + minimal operator SCSS for layout-only classes (`**starting-point`, `\*\*source-dropdown`, etc.).
- `[VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)`: **Delete** duplicated theming now owned by `dark-dropdown.scss` / `dark-modal.scss`; keep only **operator-specific layout** (e.g. control max-width, flex gaps) if any.

## 6. Verification

- Header version menu: dark surface, selected/hover not `#EDEDED`, footer readable, width as intended.
- Create/Edit version modals: inputs/textarea/radios/source dropdown/footer match current behavior without white-on-white.
- Quick smoke: open any existing `Dropdown` elsewhere (no `styles` prop) unchanged visually.
