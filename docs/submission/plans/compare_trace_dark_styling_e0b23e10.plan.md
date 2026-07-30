---
name: compare trace dark styling
overview: Update the operator compare trace tab so its panels inherit the existing dark JSON editor presentation already used elsewhere in the project, aligning the surrounding panel chrome with the Figma screenshot instead of leaving the trace panels in the light thread styling.
todos:
  - id: wire-dark-editor-shell
    content: Update CompareView trace editors to use JsonCodeEditor’s existing dark shell hooks such as className and title.
    status: completed
  - id: darken-trace-panel-shell
    content: Adjust CompareView trace-only panel styling so the surrounding panel chrome matches the dark editor treatment and Figma intent.
    status: completed
  - id: fix-trace-editor-layout-selector
    content: Replace the incorrect trace editor layout selector with the real JsonCodeEditor root class so the editor fills each column correctly.
    status: completed
  - id: darken-trace-states
    content: Restyle trace loading and empty states so they stay visually consistent with the dark trace panels.
    status: completed
  - id: validate-trace-dark-styling
    content: Run targeted lint validation on the CompareView files and confirm thread styling remains unchanged while trace styling becomes dark.
    status: completed
isProject: false
---

# Compare Trace Dark Styling Plan

## Goal

Make the `Trace` tab in [apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx) visually match the dark Figma treatment by reusing the existing `JsonCodeEditor` dark presentation instead of keeping the compare panel shell in the light thread mode styling.

## Facts From The Codebase

- [libs/break/src/lib/JsonCodeEditor/useJsonCodeEditor.ts](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/break/src/lib/JsonCodeEditor/useJsonCodeEditor.ts) defaults `JsonCodeEditor` to dark mode with `const [isDarkMode, setIsDarkMode] = useState(true)`.
- [libs/break/src/lib/JsonCodeEditor/JsonCodeEditor.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/libs/break/src/lib/JsonCodeEditor/JsonCodeEditor.tsx) exposes `className` and `title`, and its dark editor shell is rendered under the `.je-editor` root class.
- [apps/operator/src/components/RightSide/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/RightSide/styles.scss) already treats the editor as a flex child with `.je-editor`, which is the correct selector for layout.
- [apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss) currently targets `.json-code-editor` inside the trace body, which does not match the actual `JsonCodeEditor` root class.
- [apps/aui-conflake/src/components/JsonEditor/JsonEditor.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/aui-conflake/src/components/JsonEditor/JsonEditor.tsx) is a different editor implementation. Its dark theme comes from app-level global overrides in [apps/aui-conflake/src/styles/jsoneditor-dark.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/aui-conflake/src/styles/jsoneditor-dark.scss), so the reusable lesson here is the dark panel framing and editor chrome, not the exact component.

## Planned Changes

### 1. Make CompareView use the existing dark editor shell correctly

Update [apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx) so each trace-side `JsonCodeEditor` uses the existing extension points the component already supports:

- pass a trace-specific `className` for CompareView scoping
- pass a `title` so the built-in dark `EditorHeader` renders instead of only the toolbar/body

This reuses the same dark header + toolbar + editor stack that already exists in the shared component rather than recreating it locally.

### 2. Convert the trace panel shell from light panel chrome to dark panel chrome

Adjust [apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss) so the trace branch no longer inherits the light thread presentation for its surrounding panels:

- darken trace panel backgrounds and borders to visually merge with the editor
- keep the thread tab styling unchanged
- style the trace header area and interaction navigation so it reads as part of the dark compare tool, matching the screenshot intent

### 3. Fix the editor layout hook to target the real editor root

Replace the incorrect `.json-code-editor` selector in [apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss) with `.je-editor`, matching the shared component’s DOM and the existing pattern in [apps/operator/src/components/RightSide/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/components/RightSide/styles.scss).

This is the smallest correct fix to ensure the trace editor fills each column and the dark shell applies cleanly.

### 4. Keep loading and empty states visually consistent with dark trace mode

Update the trace-specific loading and empty wrappers so they sit on the same dark surface as the editor rather than leaving light gaps when trace content is not yet available.

## Files Expected To Change

- [apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/CompareView.tsx)
- [apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss](/Users/bugo/Documents/Developer/aui/aui-frontend-hub/apps/operator/src/widgets/FineTuningView/partials/CompareView/styles.scss)

## Validation

- Confirm `Thread` tab still keeps its current light panel styling.
- Confirm `Trace` tab renders dark editor headers/toolbars/panels on both columns.
- Confirm the editor fills each trace column using the `.je-editor` root.
- Confirm loading and empty states do not show light panel seams.
- Run targeted lint checks on the changed CompareView files.

## Key Implementation Note

The most accurate path is to reuse `JsonCodeEditor`’s existing dark presentation in `@aui/break`. Conflake’s `JsonEditor` demonstrates the desired dark visual language, but it is not the same component and should not be copied into operator for this change.
