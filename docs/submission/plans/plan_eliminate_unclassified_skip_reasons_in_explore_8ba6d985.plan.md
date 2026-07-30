---
name: "Plan: Eliminate \"Unclassified\" Skip Reasons in Explore"
overview: ""
todos: []
---

# Plan: Eliminate "Unclassified" Skip Reasons in Explore

This plan aims to update the `SkipReason` schema and mapping logic to ensure every skipped ticket has a specific, granular reason visible in Explore, eliminating "Unclassified" outcomes.

## 1. Schema Updates

Update `schema.prisma` to add granular values to the `SkipReason` enum.

- **File**: [`schema.prisma`](schema.prisma)
- **Action**: Add the following values to `enum SkipReason`:
- `NO_SUGGESTED_REPLY` (Covers: AI didn't answer, empty response)
- `NO_AGENT_CONFIGURED` (Covers: Auto-response agent missing)
- `ASSIGNED_TO_ANOTHER_AGENT` (Covers: Ticket assigned to non-Quack agent)
- `REPLY_ALREADY_SENT` (Covers: Duplicate reply prevention)
- `TIME_LIMIT_EXCEEDED` (Covers: Ticket too old for update)
- `USER_NOT_FOUND` (Covers: Tenant user lookup failed)
- `FAILED_TO_GENERATE_REPLY` (Covers: Technical failures in generation)
- `STRICT_MODE` (Covers: Strict mode constraints)

## 2. Database Migration

Create and apply a database migration to reflect the schema changes.

- **Action**: Run `yarn prisma migrate dev --name add_skip_reasons`
- **Verification**: Ensure the migration SQL file is generated and applied.

## 3. Update Resolution Logic

Map all `InteractionEventReasonForDecision` values to the new `SkipReason` enum values.

- **File**: [`src/ticket-calculation/service/ticket-calculation-resolution-v2.service.ts`](src/ticket-calculation/service/ticket-calculation-resolution-v2.service.ts)
- **Action**: Update `getResolutionStatus` to map:
- `NO_SUGGESTED_REPLY`, `NO_SUGGESTED_REPLY_FOUND`, `QUACK_DID_NOT_KNOW_HOW_TO_ANSWER`, `NO_AI_AUTO_RESPONSE`, `NO_AI_AUTO_RESPONSE_FOUND` -> `SkipReason.NO_SUGGESTED_REPLY`
- `NO_AUTO_RESPONSE_AGENT_ID_CONFIGURED` -> `SkipReason.NO_AGENT_CONFIGURED`
- `THE_TICKET_WAS_ASSIGNED_TO_SOME_OTHER_AGENT` -> `SkipReason.ASSIGNED_TO_ANOTHER_AGENT`
- `SUGGESTED_REPLY_ALREADY_SENT`, `SUGGESTED_REPLY_ALREADY_SENT_FOR_THIS_TICKET` -> `SkipReason.REPLY_ALREADY_SENT`
- `THE_TICKET_EXCEEDED_THE_TIME_LIMIT_FOR_UPDATES` -> `SkipReason.TIME_LIMIT_EXCEEDED`
- `TENANT_USER_NOT_FOUND`, `TENANT_USER_NOT_FOUND_OR_NOT_HAVING_EMAIL_RELATED_IN_KUSTOMER` -> `SkipReason.USER_NOT_FOUND`
- `FAILED_TO_CREATE_SUGGESTED_REPLY` -> `SkipReason.FAILED_TO_GENERATE_REPLY`
- `STRICT_MODE_IS_ON_AND_THERE_ARE_NO_TICKETS` -> `SkipReason.STRICT_MODE`

## 4. Verification

- Verify the build passes: `yarn build`
- Verify no lint errors: `yarn lint`