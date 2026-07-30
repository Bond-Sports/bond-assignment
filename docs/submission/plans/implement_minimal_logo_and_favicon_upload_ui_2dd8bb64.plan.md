---
name: Implement Minimal Logo and Favicon Upload UI
overview: Replace the current file upload components for Logo and Favicon with a new, minimal UI featuring a toggle, a circular preview, and an 'Add' button, as per the Figma design.
todos:
  - id: update-config-type
    content: Add logoEnabled and faviconEnabled to KnowledgeHubConfig type and default config
    status: completed
  - id: create-minimal-upload-component
    content: Create MinimalUpload.tsx with the new UI structure
    status: completed
  - id: create-minimal-upload-styles
    content: Create MinimalUpload.module.scss with styles for the circular preview and layout
    status: completed
  - id: integrate-in-drawer
    content: Integrate MinimalUpload into KnowledgeHubDrawer for Logo and Favicon
    status: completed
---

