---
name: Dark VersionDropdown menu
overview: Restyle the VersionDropdown’s open panel to match the dark charcoal treatment used by `version-actions-menu` and `version-dropdown-modal`, add the design’s second footer row (“Version History”), and add a decorative pin icon for published (“Live”) rows. Avoid changing shared Break Dropdown SCSS in `libs/break`; scope all overrides under the version dropdown container.
todos:
  - id: scss-dark-menu
    content: Add .version-dropdown-container scoped dark overrides for menu, break-dropdown-menu, options, footer, chips
    status: completed
  - id: footer-version-history
    content: Add Version History row to menuFooter in VersionDropdown.tsx (UI / noop)
    status: completed
  - id: custom-option-pin
    content: Show IconPin for published rows in CustomOption.tsx
    status: completed
isProject: false
---

# Dark VersionDropdown menu (match design + modals / Actions menu)

## Goal

Replace the current **light** react-select menu (white `break-dropdown-menu`, neutral option rows) with a **dark** panel aligned to:

- `[version-actions-menu](apps/operator/src/components/VersionDropdown/styles.scss)` (`#1a1a1a`, light border, subtle shadow, light text, hover wash)
- `[break-modal-container.version-dropdown-modal](apps/operator/src/components/VersionDropdown/styles.scss)` (same charcoal family as Create/Edit modals)

Keep `**withPortal={false}` on `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` so the menu stays under `[.version-dropdown-container](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` and selectors stay reliable.

## 1. SCSS: scoped dark theme (operator only)

Extend `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)` with a dedicated block, e.g. `**.version-dropdown-container .dropdown.version-dropdown`, that overrides:

| Layer          | Target (examples)                                                                                                | Intent                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outer menu     | `.dropdown__menu` (plus your existing `classNames.menu` → `menu`)                                                | Background `#1a1a1a`, border `1px solid rgba(255,255,255,0.12)`, shadow like `version-actions-menu`, radius ~8–10px                                     |
| Break shell    | `.break-dropdown-menu`                                                                                           | Transparent or same fill; ensure inner layout still `height: 100%` / `overflow: hidden` from break                                                      |
| Header         | `.break-dropdown-menu__header`                                                                                   | Sticky bar same bg as menu (not white)                                                                                                                  |
| Title          | `.break-dropdown-menu__title`                                                                                    | Muted light label (`rgba(255,255,255,0.55)`), adjust padding to match density                                                                           |
| Options scroll | `.break-dropdown-menu__options` / `.menu-list`                                                                   | Track/scrollbar optional; keep `overflow-x: hidden` behavior                                                                                            |
| Options        | Existing `[.menu-list .version-dropdown-option](apps/operator/src/components/VersionDropdown/styles.scss)` rules | Replace light neutrals: primary text light, secondary muted; hover / selected = `rgba(255,255,255,0.08)` (and slightly stronger for selected if needed) |
| Footer         | `.break-dropdown-menu__footer`, `__footer-action`, labels, hover                                                 | Dark sticky footer bg, `border-top` `rgba(255,255,255,0.08)`, light text/icons, hover `rgba(255,255,255,0.08)` instead of `$neutral_20`                 |
| Chips          | `.chip.success-appearance`, `.chip.gray-appearance` inside this menu                                             | Tune for dark panel (e.g. subtler Live green, Draft gray with translucent bg/border) so they match the reference                                        |

**Do not** edit `[libs/break/src/lib/Dropdown/styles.scss](libs/break/src/lib/Dropdown/styles.scss)` for this—only operator SCSS under the version container so other dropdowns stay unchanged.

**Optional (parity with Actions trigger):** If you want the **closed** control to match the white pill `[version-actions-button](apps/operator/src/components/VersionDropdown/styles.scss)`, add a small override block for `[.version-dropdown-control](apps/operator/src/components/VersionDropdown/partial/CustomControl.tsx)` (white fill, dark text, pill radius, chevron color). The reference screenshots emphasize the **open** menu; this can be a follow-up if the header already looks correct.

## 2. Footer: “Version History” row

In `[VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)`, expand `menuFooter` to mirror the design:

- Keep **Create Version** (existing `handleOpenCreateVersionModal`).
- Add **Version History** with an icon (e.g. `IconHistory` from `central-icons`, same 16px pattern as `IconPlusLarge`) and label text.
- **Behavior:** use a no-op `onClick` (or `undefined`) until you define navigation/modal; document with a short comment. There is **no** existing operator route/hook for “agent version history” in-repo, so wiring is intentionally deferred.

Use the same structural pattern as today: `Flex` vertical, two `[Button](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` rows with `break-dropdown-menu__footer-action` + `custom-dropdown-button` (or a dedicated class if you need different icon color for dark footer).

## 3. Option row: pin for “Live” (published)

In `[CustomOption.tsx](apps/operator/src/components/VersionDropdown/partial/CustomOption.tsx)`:

- When `props.data.version.status === 'published'`, render a **decorative** `[CentralIcon](apps/operator/src/components/VersionDropdown/partial/CustomOption.tsx)` with `IconPin` (exists in `central-icons`) and `IconColor.White` (or neutral light) **after** the `Chip`, matching the mock. No API for “pin” exists today—purely visual.

## 4. Verification

- Manually open the version menu in the operator header: dark shell, title, rows, Live/Draft chips, footer with two actions, scrollbar still usable.
- Run `npx eslint` on touched TSX files (and `nx lint operator` if you already use it in this area).

## Files to touch

- `[apps/operator/src/components/VersionDropdown/styles.scss](apps/operator/src/components/VersionDropdown/styles.scss)` — dark overrides (main work)
- `[apps/operator/src/components/VersionDropdown/VersionDropdown.tsx](apps/operator/src/components/VersionDropdown/VersionDropdown.tsx)` — second footer row
- `[apps/operator/src/components/VersionDropdown/partial/CustomOption.tsx](apps/operator/src/components/VersionDropdown/partial/CustomOption.tsx)` — optional `IconPin` for published
