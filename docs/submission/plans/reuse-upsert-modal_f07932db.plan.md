---
name: reuse-upsert-modal
overview: Replace the newly added `ViewConstraintRuleModal` with a `readOnly` mode on `UpsertRuleModal`, reusing the staged `RuleBuilder` read-only support and removing duplicated modal UI.
todos:
  - id: add-readonly-upsert
    content: Add a `readOnly` mode to `UpsertRuleModal` and gate title, controls, and footer actions from that prop.
    status: completed
  - id: switch-constraint-list
    content: Replace the `ViewConstraintRuleModal` usage in `ConstraintRulesList` with `UpsertRuleModal` in read-only mode.
    status: completed
  - id: remove-duplicate-modal
    content: Delete the duplicated `ViewConstraintRuleModal` file and validate the touched files.
    status: completed
isProject: false
---

# Reuse UpsertRuleModal For View Mode

## Facts From The Current Staged Work

- `[apps/operator/src/components/AgentRules/RuleBuilder/RuleBuilder.tsx](apps/operator/src/components/AgentRules/RuleBuilder/RuleBuilder.tsx)` and the builder subcomponents already have staged `readOnly` support, so the rule body can already render in a non-editable mode.
- `[apps/operator/src/components/AgentRules/ViewConstraintRuleModal/ViewConstraintRuleModal.tsx](apps/operator/src/components/AgentRules/ViewConstraintRuleModal/ViewConstraintRuleModal.tsx)` is a new file that duplicates the `UpsertRuleModal` shell, imports the same SCSS, and only differs in title, disabled controls, and footer actions.
- `[apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx](apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx)` is the only current `UpsertRuleModal` call site, and the new staged view flow also lives there.

## Proposed Change

- Extend `[apps/operator/src/components/AgentRules/UpsertRuleModal/UpsertRuleModal.tsx](apps/operator/src/components/AgentRules/UpsertRuleModal/UpsertRuleModal.tsx)` with a `readOnly?: boolean` prop.
- Make the modal derive its UI from that prop:
  - title becomes `View constraint` in read-only mode, otherwise keep existing add/edit titles
  - pass `readOnly` into `RuleBuilder`
  - disable the connected-tools dropdown in read-only mode
  - remove required affordances and save logic from the footer when read-only; show a single close button instead
  - make `onChange` optional or otherwise avoid requiring save behavior in read-only mode
- Update `[apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx](apps/operator/src/components/AgentRules/ConstraintRulesList/ConstraintRulesList.tsx)` to open `UpsertRuleModal` for both editable and read-only flows instead of importing a second modal component.
- Delete `[apps/operator/src/components/AgentRules/ViewConstraintRuleModal/ViewConstraintRuleModal.tsx](apps/operator/src/components/AgentRules/ViewConstraintRuleModal/ViewConstraintRuleModal.tsx)` once its usage is removed.

## Validation

- Confirm editable add/edit behavior still works through `UpsertRuleModal` without regressions.
- Confirm read-only agent versions open the same modal in non-editable mode via the eye action.
- Run a narrow lint check on the touched operator files after implementation.
