---
name: easygerber
description: Create, inspect, revise, export, or explicitly delete EasyGerber circuit boards, or submit user-requested EasyGerber feedback, using its remote MCP tools. Use for EasyGerber board work, bug reports, and feature requests; ordinary firmware-only edits do not require this skill.
---

# EasyGerber board design

Use the installed EasyGerber MCP tools and their current schemas. Hosts may prefix tool names differently. If the connection is missing, direct the user to https://easygerber.com/agents. Never ask for credentials in chat or read them from project files.

Follow [the workflow reference](references/workflow.md) for the thin schematic format, physical settings, recovery, and permission details.

## Create and continue a board

1. Read only the relevant requirements and firmware to identify signals, power, and connectors. Send the minimum needed board data. Clarify electrical choices that cannot be inferred.
2. Search published parts with `search_parts`, supplying known filters and electrical requirements. Public browsing needs no account or board. Reuse a qualified candidate's returned ID, facts and verified pins. Check another candidate on mismatch. Resolve unknowns against the exact part’s datasheet and operating conditions. Only the first candidate includes pins when available. Call `get_part` on the selected ID for missing pins or facts. Preserve catalog IDs, pin identities, footprints, and available 3D models. For an existing board's strict Part List, retain its `boardRef` on every catalog call.
3. For a new board, generate one private `boardRef`: `egbr1_` followed by 32 cryptographically random bytes encoded as unpadded base64url (43 characters after the prefix). Call `create_board` with that reference, a fresh UUID `requestId`, a name, and the complete thin intent. The service uses the valid connected account or establishes private access automatically. No guest setup or account-mode choice is needed. Omit `boardEdits` for normal defaults; author only requested app-visible settings. Never invent parts or hidden routing/manufacturing constraints.
4. Keep the same `boardRef` in private tool context across turns and pass it to all subsequent board operations. It replaces the need to coordinate a board ID and a separate access token. Read `get_board` before editing, then use its `revision` as `expectedRevision` and a new request ID for a new edit. On a revision conflict, reread and reconcile instead of overwriting a newer change.
5. Layout starts automatically. Each successful `create_board` or `update_board` that leaves the board without a current layout returns the job it started as `generation`. Follow that `generation.id` with `get_generation`; if the ID was lost, `get_generation` with the same `boardRef` reads the current job. Wait the returned interval and stop at completed, failed, or cancelled. A completed layout saves a new revision: use the returned `boardRevision`, or read the saved board, before the next edit, check, or export. Call `generate_layout` only to retry after a failed or cancelled job, or when a save reports `layoutNotStarted`; never to ask whether a job finished.
6. Return the private board link and requested artifacts. For manufacturing export, check the current saved layout with `check_board_layout` and report any blocking issues. For an editable `.egb` backup, export the valid saved project directly, even if layout is missing, incomplete, or stale; do not generate or check a layout solely for that backup.

The reference is private authority, not a public board UUID or a request ID. Keep it in tool arguments/results or supported private host state, never in ordinary messages, source files, analytics, or diagnostic logs. In isolated code execution, preserve it for later calls rather than returning only a success summary and discarding the state. Do not assume a host retains variables between executions. The returned private board URL is the user-facing exception needed to return to the board.

For a lost creation response, resend the original `boardRef`, `requestId`, and exact arguments. Do not mint a replacement reference. Changed input needs a new request ID, but a consumed reference cannot create another board. For existing work, use its reference or owning account; missing, invalid, revoked, or rejected access never authorizes replacement work. The service cannot recover private authority from an IP address, client label, public UUID, or memory of a board name.

## Account access

Use the host's normal sign-in flow for account work. When the user wants to keep this private board in their account, call `save_board_to_account` with the same `boardRef`; it needs a connected account with write access and saves the board into that account. Reading with `get_board` never moves a board: a private board has no `ownerUserId`. Use the returned account board's `id` and `revision` for further edits. Finish any active layout before saving; `get_generation` and `stop_generation` do not themselves claim the board. Follow a busy response without cancelling the job or switching identities. The saved account copy preserves the layout, but not the old job history: a null generation after the save does not require regeneration when `get_board` reports a current layout.

New account boards are personal by default. Use `get_profile` only when account identity matters and `list_organizations` only for requested organization work. Existing boards retain their actual ownership and permissions. Signing in solely for feedback or deletion does not authorize transferring another private board. Invalid account credentials require reconnection, never silent fallback to anonymous access.

## Scope and compatibility

Use `delete_board` only for an explicit request to delete a specified account board. It requires separate `boards:delete` consent, appropriate ownership, and a fresh saved revision. Ordinary sign-in must not request deletion permission. Only `{ boardId, deleted: true }` confirms deletion; `not_found` or a lost response does not. Never claim a private board merely to delete it.

Use `submit_feedback` only when the user asks or agrees to send feedback. Read the workflow's feedback section first. Send only the approved message, never automatic transcripts, diagnostics, board content, credentials, or private links. Feedback needs no board or sign-in. Return its receipt without promising a response. If unavailable, offer [GitHub Issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues) and explain that issues are public before posting.

Older clients may still use `guestToken`, `guestCreationKey`, or explicit guest-start/claim calls. These are compatibility inputs, not setup steps for new work. Preserve an existing task's valid access and follow the workflow reference when continuing such a task.

Creating, revising, generating, or exporting does not authorize deletion, public sharing, or purchasing fabrication. Report saved, generated, checked, and exported states accurately. Successful generation is not a safety certification; an unavailable check is not a pass.
