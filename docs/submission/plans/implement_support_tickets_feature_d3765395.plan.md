---
name: Implement Support Tickets Feature
overview: Implement a new feature to display user support tickets in the Knowledge Hub, including a main page indicator (button) and a dedicated tickets list page with filtering and searching capabilities.
todos:
  - id: update-config-model-tickets
    content: Update `KnowledgeHubConfiguration` in `config.model.ts` to match the JSON provided.
    status: completed
  - id: create-tickets-hook
    content: Create `useUserTickets` hook in `src/features/support-tickets/api/use-user-tickets.ts` using `react-query`.
    status: completed
    dependencies:
      - update-config-model-tickets
  - id: create-tickets-indicator
    content: Create `OpenTicketsIndicator` component for the homepage.
    status: completed
    dependencies:
      - create-tickets-hook
  - id: create-tickets-page
    content: Create `TicketsPage` component with search, filter, and list.
    status: completed
    dependencies:
      - create-tickets-hook
  - id: add-tickets-route
    content: Add `/tickets` route to `AppRouter` in `src/app/routes/index.tsx`.
    status: completed
    dependencies:
      - create-tickets-page
  - id: integrate-homepage-indicator
    content: Integrate `OpenTicketsIndicator` into `src/app/routes/homepage.tsx`.
    status: completed
    dependencies:
      - create-tickets-indicator
      - add-tickets-route
---

