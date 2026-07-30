---
name: RuleQuestionsField read-only parity
overview: Improve the `readOnly` branch of `RuleQuestionsField` so questions use the same visual structure as the edit modal (title + tooltip, helper copy, one row per question with full-width read-only inputs), without opening a second modal.
todos:
  - id: readonly-markup
    content: "Rewrite RuleQuestionsField readOnly branch: title + tooltip, helper, rows with disabled Input(s), empty state"
    status: completed
  - id: readonly-scss
    content: Extend RuleQuestionsField.scss for read-only input width / title spacing
    status: completed
  - id: verify-lint
    content: Run nx lint operator (or eslint on touched files)
    status: completed
isProject: false
---

# RuleQuestionsField read-only layout parity

## Context

`[RuleQuestionsField.tsx](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` currently renders read-only mode as a plain vertical list of `[Text](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)`. Edit mode uses a trigger button plus a `[Modal](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` whose content is: title **Questions** + tooltip icon, short helper line, then `**Flex` rows with `[Input](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` + remove button.

Read-only is only used from `[RuleAction.tsx](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleAction.tsx)` when `readOnly` (e.g. `[ViewConstraintRuleModal](apps/operator/src/components/AgentRules/ViewConstraintRuleModal/ViewConstraintRuleModal.tsx)`). A **nested “view questions” modal** would be awkward; **inline layout matching the modal body** is the right default.

## Implementation

### 1. Replace the read-only early return with modal-parallel markup

In the `if (readOnly)` block (~lines 36–55):

- **Title row**: Match `Modal.Title` content — label **Questions** plus the same `[Tooltip](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` + `[IconCircleQuestionmark](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` wrapper using existing class `[rule-questions-field__title-icon](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.scss)` (use `Text` for the title so size/weight matches the rest of the rule builder; keep tooltip text identical to edit mode).
- **Helper line**: Reuse the same instructional copy as the modal (`Add the questions that should be asked.`) **or** a neutral variant for read-only only if you prefer (e.g. “These questions are asked when the rule is triggered.”). Default recommendation: **same sentence as modal** for zero copy drift.
- **List**: For each non-empty question string, render a row structurally similar to the modal:
  - `Flex` horizontal, `spacing="xsmall"`, `alignItems="center"`, full width.
  - One `[Input](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` with `value={question}`, `readOnly`, `disabled`, no `onChange` needed (or no-op). Omit the remove `[Button](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)`. Optionally reserve horizontal space where the trash button was (e.g. empty `span` with same min dimensions as `[rule-questions-field__remove-question-btn](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.scss)`) so columns align with the modal screenshot mentally — optional; if it looks odd without the button, a `min-width` spacer is enough.
- **Empty state**: Keep a single light `[Text](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.tsx)` (“No questions”) **below** the title/helper (or inside the same vertical stack) so structure matches “opened modal with zero rows” rather than collapsing the whole block.

Wrap the read-only block in a container with classes e.g. `rule-questions-field rule-questions-field--read-only` (already partially used) plus a content class if needed for SCSS.

### 2. SCSS touch-ups in `[RuleQuestionsField.scss](apps/operator/src/components/AgentRules/RuleBuilder/components/RuleQuestionsField.scss)`

- Under `.rule-questions-field--read-only` (or a nested `__read-only-content`), apply the same **input full-width** behavior the modal gets via `.rule-questions-field__modal .break-input-container { width: 100%; }` so read-only rows match modal width. Prefer **scoping under the read-only modifier** to avoid affecting other screens.
- Add minimal rules for the read-only title row if needed (e.g. spacing under title, align icon with text).

### 3. Optional DRY (only if duplication hurts)

If the modal body and read-only body share a large chunk of JSX, extract a private inner component or render function (e.g. `renderQuestionRows({ questions, editable: boolean, ... })`) **inside the same file** first; only split files if it stays readable.

### 4. Verification

- Manually: open **View constraint** for a rule with **multiple questions** and confirm rows look like the edit modal (title, tooltip, helper, input-shaped rows).
- Run `npx nx run operator:lint` on the touched files (from repo root).

## Out of scope

- Changing edit-mode modal behavior or the trigger button.
- Replacing `key={index}` with stable keys (pre-existing; only change if you touch those lines and want a quick win).
