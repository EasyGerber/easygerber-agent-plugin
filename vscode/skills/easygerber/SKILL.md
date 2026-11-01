---
name: easygerber
description: Create, inspect, revise, export, or explicitly delete EasyGerber circuit boards, or submit user-requested EasyGerber feedback, using its remote MCP tools. Use for EasyGerber board work, bug reports, and feature requests; ordinary firmware-only edits do not require this skill.
---

# EasyGerber board design

Use the installed EasyGerber MCP tools for the requested board workflow. Hosts may prefix tool names differently; discover the tools available on the EasyGerber connection and follow their current schemas. If the connection is missing, direct the user to https://easygerber.com/agents. Never ask for tokens in chat or read credentials from project files.

## Create and deliver a board

Follow [the workflow reference](references/workflow.md) for the compact schematic example, supported settings, and recovery details.

1. Read only relevant firmware and requirements to identify signals, power, and connectors. Send the minimum needed board data, not the whole repository. Clarify electrical choices that cannot be inferred.
2. Finish any pending guest claim, then reuse this task's guest session or authorized account. If neither is established, call `start_guest_session` directly; `account_connected` means use the account. Do not probe with `get_profile` or `list_organizations`, including in parallel. Users need not choose an account mode or mention guests. Retain the returned capability and pass `guestToken` to guest catalog and board tools. A successful start creates a new session; never repeat it to recover a lost or ambiguous response.
3. Search published parts and reuse returned catalog facts and verified pins. Only the first search candidate is enriched with pins; call `get_part` when the selected part lacks needed pins or facts. Check electrical compatibility and supporting circuitry. Preserve catalog IDs, pin identities, footprints, and available 3D models; never invent them.
4. Call `create_board` with a name, a fresh UUID `requestId`, and the thin intent. Map the returned catalog `id` to `dbId` and the chosen `pins[].number` to connection `padId`. Omit `boardEdits` to use normal defaults; specify only requested app-visible changes. If layout is requested, use the created board's `id` and `revision` directly with `generate_layout` when nothing has changed; no extra board read is needed between them.
5. Poll the exact generation ID at the returned interval until terminal. After completion, read `get_board` for the saved revision and preview, check the current layout with `check_board_layout`, and export the requested files. A saved schematic is not yet a completed layout. If the check tool is unavailable, report the service/integration mismatch; never substitute another tool or call an unavailable check a pass.
6. Return the private board link and requested artifacts. Preserve stable private download links exactly, including their capability fragment; they return the exported snapshot without an automatic expiry or a customer-facing renewal step. One guest board supports preview, manufacturing ZIP, and `.egb` export before signup, without lifetime operation caps or automatic expiry when `expiresAt` is null. Normal request-rate, complexity, and shared compute protections apply.

For requested physical or electrical constraints, the shared tools support part clearances, keepout regions, and per-pin current requirements. Use the workflow reference for their patch and replacement rules. Read back the saved values and check the resulting layout; accepting a requirement does not establish that the PCB meets it.

Keep `guestToken` in tool arguments only, never in project files, logs, or ordinary messages. The returned private viewer link is the user-facing exception needed to return to the board. On detailed validation errors, repair the reported fields while preserving valid intent and the same guest session. Changed input needs a new `requestId`; retry unchanged input with the same ID. Inspect an existing board before editing, and reread after a revision conflict instead of overwriting a newer change. Reuse known operations after uncertain outcomes.

## Account access and saving a guest board

Existing account boards and organization work require the host's sign-in flow; an expired account connection is not permission to recreate private work as a guest. In the private guest viewer, signing in or creating an account saves the board and opens it automatically after the server confirms the save. This browser sign-in does not authorize the agent connection. Read the guest/account section of the workflow reference when handling host sign-in or a pending claim.

When the user chooses sign-in or account board work with a guest board in this task, automatically save that board to their personal account. Signing in solely to delete an account board or submit feedback does not authorize claiming a guest board; never claim a guest board merely to delete it or send feedback. Use `claim_guest_board` with its original `guestToken` to initiate account authorization, then retry that same claim immediately when authentication resumes. Do not ask a separate “Keep board?” question or use `get_profile` as a substitute for the pending claim. Follow the workflow reference for busy retries and the returned account board ID. Generic native Settings **Authenticate** has no guest-board context; after that flow, the agent must resume the claim to complete the save.

New account boards belong to the personal account by default; `get_profile` is needed only when account identity matters to the request. Use `list_organizations` and pass `organizationId` only for an organization the user requested. Existing boards retain their saved ownership, subject to the user's permissions.

## Deletion, feedback, and scope

Use `delete_board` only for an explicit user request to delete a specified account board, never for unsolicited cleanup. Deletion is permanent, has no restore operation, and cancels active jobs. It requires separately approved `boards:delete` access plus personal ownership or an organization owner/admin role; `boards:write` is insufficient. Read `get_board` first and pass its revision as `expectedRevision`. Guest boards cannot be deleted through this tool. Read the deletion section of the workflow reference before calling it. Report success only from `{ boardId, deleted: true }`; `not_found` can mean unavailable, insufficient ownership, or already absent and does not prove this request deleted the board.

Use `submit_feedback` only when the user asks or agrees to send a bug report, feature request, or general feedback to EasyGerber. Read the feedback section of the workflow reference first. Send a concise approved message, never automatic transcripts, raw diagnostics, board exports, credentials, or private links. Feedback can be anonymous without signing in, starting a guest session, or creating a board; existing valid account or guest access can attribute it. Do not expand board permissions for feedback. Return the receipt without promising a response or roadmap commitment. If the connection or service is unavailable, offer [GitHub Issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues) and explain that issues are public before any posting.

Keep actions within the user's requested scope. Creating, revising, or exporting a board does not authorize deletion, public sharing, or purchasing fabrication. Explain returned electrical or manufacturing issues accurately; successful generation or no blocking issues is not a safety certification. Return the board link and requested artifacts, and distinguish saved, generated, exported, and explicitly confirmed deleted states.
