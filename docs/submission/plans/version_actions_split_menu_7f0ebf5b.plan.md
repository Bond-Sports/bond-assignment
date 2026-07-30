---
name: Version Actions split menu
overview: Add a pill-shaped "Actions" control with a visual vertical divider and chevron next to the existing version selector in the header, opening a dark-styled floating menu with five labeled rows (plus a separator before Archive). Interaction is limited to open/close via `@aui/break` Menu; menu item handlers can be no-ops until you wire behavior.
todos:
  - id: add-split-component
    content: Add VersionActionsSplitButton.tsx with Menu, 5 MenuItems, icons, no-op clicks
    status: completed
  - id: wire-version-dropdown
    content: Render VersionActionsSplitButton in VersionDropdown Flex after Dropdown
    status: completed
  - id: scss-dark-menu-pill
    content: Add SCSS for pill trigger + dark menu + Archive top border
    status: completed
isProject: false
---

# Version Actions split button (UI only)

## Placement and structure

- Render the new control **inside** `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` in the existing `[Flex](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` row, **after** the `Dropdown` (still under `if (!currentAgent) return null`), so it appears in the header next to the version control without touching `[Header.tsx](apps/operator/src/widgets/Header/Header.tsx)`.

## Implementation approach

- **Reuse** `[Menu](libs/break/src/lib/Menu/Menu.tsx)` and `[MenuItem](libs/break/src/lib/Menu/Menu.tsx)` from `@aui/break` (same stack as `[AgentRerunSplitButton](apps/operator/src/widgets/AgentBuilder/partials/AgentRerunSplitButton.tsx)`: Floating UI + portal, keyboard support, focus management).
- **Trigger (white pill, matches reference):** use `triggerVariant="unstyled"`, `withArrow={false}`, and pass a composite `**label` JSX: `"Actions"` text, a vertical divider (`aria-hidden`), and `IconChevronDownSmall` from `central-icons` wrapped in `[CentralIcon](libs/break/src/lib/Icon/CentralIcon.tsx)` (e.g. `IconColor.Black` on the chevron). Style the outer `Menu` `className` so the trigger is a single pill (`border-radius` ~999px, white background, dark text, medium font weight, horizontal padding, subtle shadow if needed).
- **Menu (dark panel, matches reference):** set `menuClassName` to a BEM-ish block (e.g. `version-actions-menu`) and override default `.menu` / `.menu-item` light theme in SCSS: charcoal background (~`#1a1a1a`, aligned with` [.break-modal-container.version-dropdown-modal](apps/operator/src/components/VersionDropdown/styles.scss)`), ~8px rounded panel, light text (`rgba(255,255,255,0.9)`), hover/focus row background` rgba(255,255,255,0.08)`, box-shadow similar to the modal dropdown block in the same file.
- **Items (icons + copy from design):** each `MenuItem` gets `label` as a flex row: left `CentralIcon` (`IconColor.White` or `IconSize.Medium` / ~16px) + label text, using icons that exist in `central-icons`:
  - Publish Version — `IconRocket`
  - Edit Version Details — `IconPencil` (already used elsewhere in operator)
  - View Changes — `IconHistory`
  - Revert to this Version — `IconArrowUndoUp`
  - Archive Version — `IconArchive` (or `IconArchive1` if sizing looks better)
- **Separator before Archive:** avoid a dummy `MenuItem` row (keyboard nav in `Menu` assumes real items). Instead, add a class on the Archive `MenuItem` (e.g. `version-actions-menu__item--section-start`) with `margin-top`, `padding-top`, and `border-top: 1px solid rgba(255,255,255,0.08)`.
- **Behavior for now:** either omit `onClick` on items or use empty handlers; the menu will still close on item click via the existing FloatingTree `click` event in `Menu` (acceptable for UI-only). Use `placement="bottom-start"` (or tune to avoid clipping) and `aria-label="Version actions"` on the root `Menu` for the trigger.

## Files to add or change

| Action | File                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add    | `[apps/operator/src/components/VersionDropdown/partial/VersionActionsSplitButton.tsx](apps/operator/src/components/VersionDropdown/partial/VersionActionsSplitButton.tsx)` — thin presentational component: `Menu` + five `MenuItem`s as above.                                                                                                                                                                         |
| Edit   | `[apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` — import and render `VersionActionsSplitButton` after `Dropdown`.                                                                                                                                                                                                                |
| Edit   | `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)` — new blocks for `.version-actions-split-button` (trigger) and `.version-actions-menu` (panel + items + section border). Prefer existing SCSS variables already used in this file (`$font-`, neutrals) and align dark values with the existing `version-dropdown-modal` palette where practical. |

## Conventions

- Match **VersionDropdown** formatting: 2 spaces, single quotes, no new dependencies.
- **No README** unless you explicitly want one (keeps scope to your request).

## Quick verification

- Run `nx lint operator` (or your usual narrow target) after edits.
