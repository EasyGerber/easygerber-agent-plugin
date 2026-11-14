---
name: easygerber
description: Create, inspect, revise, export, or explicitly delete EasyGerber circuit boards, or submit user-requested EasyGerber feedback, using its remote MCP tools. Use for EasyGerber board work, bug reports, and feature requests; ordinary firmware-only edits do not require this skill.
---

# EasyGerber board design

The complete Board workflow reference is included below in this skill. Read the relevant section here before using its tools.

Use the installed EasyGerber MCP tools and their current schemas. Hosts may prefix tool names differently. If the connection is missing, direct the user to https://easygerber.com/agents. Never ask for credentials in chat or read them from project files.

Follow [the workflow reference](#board-workflow) for the thin schematic format, physical settings, recovery, and permission details.

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

## Board workflow

The server tool schema is authoritative for field names, allowed settings, required scopes, and result shapes. Start with the creation sequence below; account handoff, recovery, deletion, and feedback details follow it.

## Create from firmware or requirements

1. Identify requirements from the user's request and relevant firmware: signals, power, connectors, and missing electrical choices. Read only relevant files and send only needed board data.
2. Use one ordinary board workflow. Public catalog browsing needs no account or reference. A new board uses the valid connected account, or the service establishes private access automatically. Personal ownership is the account default; use an organization only when requested. Existing boards retain their actual owner and authorization.
3. Use `search_parts` with known catalog filters and enough candidates to compare. Keep an exact MPN in `query`. For a red 0603 LED, supply `category: "led"`, `package: "0603"`, and `query: "red"`. Put supported electrical bounds in `requirements`. For LED forward voltage, use `forwardVoltage` with the required current and temperature when specified. Reuse the ID of a qualified candidate. Move to the next on mismatch. For unknown, verify the exact part and conditions in its datasheet or report the missing evidence. Use `candidateIds` to check previously found IDs against new requirements. Keep all explicit constraints, including the board’s strict Part List and its `boardRef` on every lookup. Use `get_part` on a selected ID for missing facts or pins. Only the first search candidate includes footprint-matched pins when available. Verify support circuitry and connector form factor. Preserve catalog identity, footprint and available 3D model.
4. Generate one private `boardRef` as `egbr1_` followed by 32 cryptographically random bytes encoded as unpadded base64url (43 characters after the prefix). Submit `create_board` with that reference, `name`, a fresh UUID `requestId`, and the thin intent below. Keep the reference and complete original request in private tool context across turns. Omit `boardEdits` for defaults; include only requested settings/customizations supported by the app. The service supplies component geometry, models, and hidden routing/manufacturing constraints, including for test coupons.
5. Continue with the returned `boardRef`, `revision`, and private `url`. Pass the same reference to reads, edits, status polls, checks, previews, and exports. Creation also starts the PCB layout and returns that job as `generation`; follow it with `get_generation` instead of calling `generate_layout`. A saved schematic and a completed layout are still different outcomes: report the layout only after its job completes.

### Map returned parts into the thin intent

Parts are string arrays `[id, dbId, value]`, with an optional fourth `designator` when the printed label differs from `id`. The first `id` is your instance identity within this board; `dbId` is the selected returned part's catalog `id`, from `search_parts` or `get_part`. The required third item is its value/display label. Connections contain `net`, `class` (`power`, `signal`, or `ground`), and `pins`. Each connected pin is exactly `[partId, padId]`: use the instance ID and the chosen returned `pins[].number`, both strings. Do not use a pin's display name or array index as its pad ID. Firmware pin labels describe signals; map them to the verified catalog pins.

For example, `inputConnector` and `outputConnector` below are selected part objects from actual tool results (`data` entries for search, or `data` for a part lookup). `inputPin` and `outputPin` are entries from each part's returned `pins` array, selected for the required signal after checking compatibility. No catalog IDs or pin numbers are invented:

```js
const intent = {
  parts: [
    ["J1", inputConnector.id, "Input"],
    ["J2", outputConnector.id, "Output"],
  ],
  connections: [
    { net: "SIGNAL", class: "signal", pins: [["J1", inputPin.number], ["J2", outputPin.number]] },
  ],
};
```

Use this compact shape even if the host renders nested tool fields as `unknown`; the live schema remains authoritative.

## Clearances, keepouts, and pin currents

Use these fields only when the live tool schema advertises them. Read `get_board` first when editing an existing board and retain unrelated settings.

- `boardEdits.partClearances`: `upsert` by `partId`, or `remove` by part ID. A new item needs `clearanceMm` (`front`, `back`, `left`, `right` in mm), `linked`, `restrictions`, and `copperLayers`; `enabled` defaults to true. Directions use the part's local frame. Linked distances must match.
- `boardEdits.keepouts`: `upsert` by `id`, or `remove` by ID. A new item needs `name`, `x`, `y`, `rotationDeg`, `shape`, `restrictions`, `partSide`, and `copperLayers`. Use rectangle, circle, or custom-profile geometry from the schema. Coordinates are board-plane mm. Both controls use `restrictions: { parts, tracks, vias, copperFills }`; choose actual board layers. Omitted item fields stay unchanged; supplied nested objects replace the whole nested value.
- `intent.pinCurrentRequirements`: entries identify a verified `partId` and `padId`, with nonnegative `requiredCurrentA` in amperes and `direction` (`into`, `out`, or `bidirectional`) relative to the net's copper. Omitting the list preserves existing valid pin requirements; supplying a list replaces it, and `[]` clears it. Include every requirement to retain. Use per-pin values for new requests; the older connection-wide current field remains for existing boards.

For example, a verified input pin supplying half an amp into a net uses `{ partId: "J1", padId: inputPin.number, requiredCurrentA: 0.5, direction: "into" }`. This is one entry, not a complete replacement list; retain the other pins' requirements when updating it.

Read back the saved requirements after editing. Wait for the layout that edit started to complete, then run `check_board_layout` before reporting its compliance. Layout and scoring consume these requirements, but successful saving or generation alone does not prove clearance or current capacity. Report returned blocking issues and incomplete assessments without claiming unverified compliance.

## Revise, recover, and generate

Read `get_board` before editing an existing board with `update_board`. Preserve catalog identities, valid intent, and fields outside the request. Use the current revision as `expectedRevision` and a fresh UUID `requestId` for each new update or generation operation. A completed layout advances the revision after a save has returned, so take the revision from `get_generation`'s `boardRevision` or a fresh `get_board`, not from the earlier save. A revision conflict requires a fresh board read and reconciliation, not a blind overwrite.

For detailed validation errors, fix only the reported fields while preserving valid intent and the same board reference. Changed input needs a new `requestId`; retry unchanged input with its original ID and exact arguments. Never weaken hidden constraints to silence an error. An ambiguous response does not establish failure. Read the existing board or current job using its reference, or replay the exact original creation request if its result was lost. Do not create a fresh reference or replacement board. A reference already used for creation cannot create another board, even after logout or access retirement.

Every successful `create_board` or `update_board` that leaves the board without a current layout starts one and returns it as `generation`. Inspect `generation.id` and `generation.status`, then use `get_generation` for that exact ID and follow `pollAfterSeconds`. If the ID was not retained, omit it and use the same `boardRef` to read the latest job. `get_board` also exposes the current generation and whether the saved layout is current. Stop polling at completed, failed, or cancelled. After completion, use the returned `boardRevision`, or read `get_board` for the saved revision and preview, before checking or exporting. An edit made while a layout is running replaces that job with one for the edited board; follow the new `generation`.

Call `generate_layout` only to retry: after a failed or cancelled job, or when a save returns `layoutNotStarted` (wait any `retryAfterSeconds` first). If a layout of that revision is already running or was just saved, it returns that job instead of starting another. A timeout is a reason to read status, not to start another generation. Reusing a generation request ID with a newer revision is changed input and correctly conflicts. `stop_generation` is for a user-requested stop.

## Check and export

When reviewing a layout or preparing a manufacturing ZIP, use `check_board_layout` to check the current saved layout. Its `validation` reports `hasBlockingIssues` and actionable `blockingIssues`; report those issues or say that no blocking issues were found. Numeric scores and deductions are not exposed. A null `validation` on a board read means it has no current assessment, not that it passed; generate a fresh layout if needed and run the check. An unavailable check is not a pass or permission to substitute another tool.

Use `export_board` with the saved revision from `get_board`. For an editable backup (`format: "egb"`), export the valid saved project directly, including projects with missing, incomplete, or stale layouts. Do not generate a layout or run `check_board_layout` solely for an EGB export; exporting a backup does not establish manufacturing readiness. Manufacturing ZIPs require current PCB geometry and electrical requirements: generate or refresh the layout if needed, then read the saved revision and check the layout before exporting.

New exports require current board access and remain subject to document validation and size limits. Return the private board link and artifact links, or download artifacts to a user-requested local destination using the host's tools. Stable private download links have no automatic expiry and return the exact exported snapshot, including after board edits or deletion, guest claim, and guest cleanup. Preserve returned links exactly, including their capability fragment. The download page refreshes temporary storage authorization automatically. Only explicit download-link revocation or deletion of the exported file ends access. An unavailable download is not permission to bypass revocation or silently export a different revision. Do not infer that exporting orders a physical board.

Follow the connected service's advertised behavior. Do not promise that an unavailable historical link can be restored.

A stable link opens a browser download page; fetching that page directly returns HTML, not the exported file. For a user-requested local download, a nonbrowser client can read the link's fragment token in memory, then POST JSON `{ "token": token }` to `/api/downloads/{artifactId}` on the same origin as the returned link, with `Content-Type: application/json` and `Origin` set to that origin. The response contains `name` and a temporary storage `url`; download that URL unchanged to the requested destination. Do not put tokens or signed URLs into command history, diagnostics, analytics, or public output. Request another storage URL from the same stable link if needed; do not regenerate the board or export a different revision.

## Private references and account access

The same `boardRef` identifies the board and supplies its private continuation capability where anonymous access is supported. It is not a public board UUID, request ID, IP address, or visitor identity. Copy references returned by the service unchanged; account-list references are opaque and still require the owning account's authorization. Do not parse a reference to infer ownership or broaden access.

Keep the reference in private tool arguments/results or supported secure host state across turns. Do not echo it to the user, write it to source files, or include it in analytics, diagnostic logs, or support requests. When orchestrating tools in an isolated execution, preserve the reference for the next execution instead of discarding it after a success summary. Do not invent host storage support or assume local variables survive. If the host loses the reference and the original creation request, explain the limitation; the service cannot reconstruct private access from public identifiers. The returned private viewer link is the user-facing exception needed to return to the board. Anyone with a complete private viewer or download link can use its granted access; do not shorten it through an external service or make it public.

For a lost first response, replay the exact original `create_board` request with the same reference and request ID. This recovers its original result without another board or trial. Once creation is known, use ordinary reads and edits with that reference. Retired, invalid, revoked, or unavailable access must never cause automatic replacement work. An anonymous `list_boards` cannot discover an earlier private reference or establish that an account has no boards.

When the user wants to keep this private board in their account, use the host's normal OAuth flow, then continue with the same reference. Call `save_board_to_account` with authorized write access to save the board into that personal account; `get_board` and other reads never do. Use the returned board state, `id` and revision for further edits. Saving preserves the reference, but anonymous access to the claimed board ends. The saved board remains subject to its actual owner's permissions. A different signed-in account cannot take over an already claimed or account-owned board. `get_generation` and `stop_generation` retain their job behavior and do not save the board. The saved account copy preserves the layout, not the old generation history; after the save, `get_generation` may return no job while `get_board` still reports a current saved layout. Do not regenerate merely to recreate job history.

Finish any running layout before saving the board to the account. If the save reports a busy board, retain the reference and follow retry guidance without cancelling the job, disconnecting the account, or replacing the board. Browser sign-in and agent authorization are distinct: signing in through the private viewer can save the board there, but the agent still needs its own normal OAuth connection for account work. Merely opening a private viewer in an already signed-in browser does not itself authorize a transfer. Signing in solely to delete a different account board or send feedback never authorizes claiming this board.

An expired or invalid account credential requires reconnection; do not remove it to fall back to anonymous access. `get_profile` is needed only when account identity matters, and `list_organizations` only for requested organization work. No account probe is a prerequisite for public browsing or a new board. Before signup, private access supports app edits, layout, checks, previews, and manufacturing and editable exports without lifetime operation caps. Null expiry means no scheduled expiration. Normal request-rate, complexity, and shared compute limits remain in force.

### Existing-client compatibility

Existing tasks may have `guestToken` plus `boardId`, or `guestCreationKey` plus the exact original creation request. These remain valid compatibility forms; do not replace a working identity merely to adopt a new field. A creation using the older `guestCreationKey` also returns the equivalent `boardRef` for continued work. A token-only legacy task keeps using its token and board ID; the service cannot reconstruct its original creation secret. Keep legacy credentials private as well. The callable `start_guest_session` boundary remains for older clients, but it is not advertised as a normal setup step and is not a recovery operation. Do not repeat an uncertain start or create another session to bypass limits or a rejection.

Legacy `claim_guest_board` calls are retained for clients already coordinating a claim with a guest token. Such a client retains that token until the claim is known, uses normal account consent, and retries the same pending claim after authorization. Read the returned account board before more writes. New reference-based work uses `save_board_to_account` as described above instead.

## Permission and limits

Ordinary account workflows use `boards:read`, `boards:write`, `boards:generate`, and `boards:export`. The separate `boards:delete` scope permits deletion only after explicit consent; an existing write grant does not include it. The installer and default client configurations retain the ordinary scopes. Existing client registrations may also exclude `boards:delete`: the client must deliberately reconnect or re-register with that scope allowed and obtain fresh consent through normal OAuth. Neither existing registrations nor grants gain deletion access automatically. If the client cannot request and obtain additional deletion consent, explain that limitation without silently changing default scopes or claiming deletion occurred. Authorization does not bypass organization membership, the existing plan, quotas, or compute limits. Guest access permits one board with no lifetime operation caps; request-rate, complexity, and shared compute protections remain. If a tool returns an authorization, rate, admission, or unsupported-setting error, explain the concrete restriction and next step. Do not change ownership or credentials to work around it. Keep private board content, guest viewer links, and signed download URLs within the user's task.

## Delete a specified account board

Delete only a board the user explicitly asked to delete. Do not delete source boards after exporting, remove test boards as unsolicited cleanup, or infer deletion from a request to start over. If the target is unclear, identify the intended account board before proceeding. This action is permanent, has no restore operation, and cancels active jobs on that board; explain these effects when carrying out the request.

Use `delete_board` only when the connected service advertises it. It requires the separate `boards:delete` OAuth scope, explicitly approved through the client's normal consent flow. `boards:write` does not authorize deletion. The account must own the personal board or hold an owner/admin role in its organization; other organization roles cannot delete it. OAuth consent alone does not authorize deleting any particular board. Guest deletion is unsupported, and claiming a guest board merely to delete it is not an alternative.

For installer-managed Codex connections without a configured OAuth client ID, the [public integration README](https://github.com/EasyGerber/easygerber-agent-plugin#delete-an-account-board) provides verified opt-in registration commands. They require fresh consent and leave default scopes unchanged. Do not apply that registration-reset procedure to other clients or fixed-client-ID connections.

Read the specified account board with `get_board`, then call `delete_board` with its `boardRef` and current `expectedRevision`. Use a reference already belonging to that account; deletion must not implicitly claim a private board. If obtaining additional consent interrupts the task, read the board again before deleting it. A revision conflict requires another read and reconciliation with the user's request; do not blindly replace the revision or delete a different board.

Only `{ boardId, deleted: true }` confirms successful deletion. Unavailable boards, insufficient ownership, and repeated requests for an already absent board return the same `not_found` result. Do not describe that result as successful deletion or infer whether an inaccessible board exists. If the deletion response is lost, report the outcome as uncertain; a later missing-board response does not prove that the original call succeeded. Do not create a replacement board or claim a guest board to resolve that uncertainty.

## Send feedback with the user's agreement

Use `submit_feedback` only when the user asks or agrees to send feedback to EasyGerber. Discussing a problem or asking for a fix does not by itself authorize a report. Choose `category` as `bug`, `feature_request`, or `general`, and send a concise `message` of 10–2000 characters after trimming, describing the issue or request the user agreed to share. Include only relevant, non-secret reproduction details. Never automatically attach or copy conversation transcripts, raw diagnostics, board exports, credentials, guest tokens, private viewer links, or signed downloads into the message. The tool accepts no attachments.

Feedback needs no account, board, new guest session, or additional board scope. With valid connected OAuth, omit `guestToken` and let the service attribute the report to that account. Otherwise, an existing valid `guestToken` may attribute it to that session; omit it for anonymous feedback. Do not call `get_profile`, create or claim a board, start a guest session, or request broader permissions merely to send feedback. Rejected existing credentials remain denied: use the normal reconnect flow or offer the fallback below, without removing credentials or changing identities to bypass the denial. Signing in solely for feedback does not authorize a guest-board claim.

Generate a UUID `requestId` for each new submission. If its response is lost, retry with the same request ID, category, message, and attribution; do not create a second report with a new ID. Follow returned rate-limit guidance without changing sessions or credentials. Success returns `{ id, createdAt, status: "submitted" }`, including on an identical retry. Return that receipt's ID and timestamp only after success. Receipt confirms storage in EasyGerber's private administrator inbox, not a reply, issue status, or roadmap commitment; there is no public feedback lookup or status tool.

If `submit_feedback` is unavailable or the MCP connection or service cannot accept the report, offer [GitHub Issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues). Explain that GitHub issues are public and require a GitHub account to post. Offer a redacted draft and obtain the user's agreement to public posting; approval to send private feedback does not authorize publishing it. Keep credentials, private links, board contents, and other confidential information out of public reports.
