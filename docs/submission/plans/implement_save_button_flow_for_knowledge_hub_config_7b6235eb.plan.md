---
name: Implement Save Button Flow for Knowledge Hub Config
overview: Switch the Knowledge Hub Drawer configuration from auto-saving on change to a manual save button workflow. This involves managing local state for all configuration fields and committing changes only when the "Save" button is clicked.
todos:
  - id: refactor-state
    content: Introduce localConfig state and remove individual field states
    status: completed
  - id: update-handlers
    content: Update all input handlers to modify localConfig
    status: completed
  - id: add-save-button
    content: Implement Save button and handleSave function
    status: completed
  - id: update-upload-logic
    content: Ensure file uploads update localConfig only
    status: completed
  - id: cleanup-autosave
    content: Cleanup auto-save effects and callbacks
    status: completed
---

