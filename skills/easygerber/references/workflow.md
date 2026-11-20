# Board workflow

The server tool schema is authoritative for field names, allowed settings, required scopes, and result shapes. Start with the creation sequence below; account handoff, recovery, deletion, and feedback details follow it.

## Create from firmware or requirements

1. Identify requirements from the user's request and relevant firmware: signals, power, connectors, and missing electrical choices. Read only relevant files and send only needed board data.
2. Use one ordinary board workflow. Public catalog browsing needs no account or reference. A new board uses the valid connected account, or the service establishes private access automatically. Personal ownership is the account default; use an organization only when requested. Existing boards retain their actual owner and authorization.
3. Use `search_parts` with known catalog filters and enough candidates to compare. Keep an exact MPN in `query`. For a red 0603 LED, supply `category: "led"`, `package: "0603"`, and `query: "red"`. Put supported electrical bounds in `requirements`. For LED forward voltage, use `forwardVoltage` with the required current and temperature when specified. Reuse the ID of a qualified candidate. Move to the next on mismatch. For unknown, verify the exact part and conditions in its datasheet or report the missing evidence. Use `candidateIds` to check previously found IDs against new requirements. Keep all explicit constraints, including the board’s strict Part List and its `boardRef` on every lookup. Use `get_part` on a selected ID for missing facts or pins. Only the first search candidate includes footprint-matched pins when available. Verify support circuitry and connector form factor. Preserve catalog identity, footprint and available 3D model.
4. Generate one private `boardRef` as `egbr1_` followed by 32 cryptographically random bytes encoded as unpadded base64url (43 characters after the prefix). Submit `create_board` with that reference, `name`, a fresh UUID `requestId`, and the thin intent below. Keep the reference and complete original request in private tool context across turns. Include `boardEdits` with the board size and a position for every part and reference designator, as described under Place the board. Beyond that, include only requested settings/customizations supported by the app. The service supplies component footprints, models, and hidden routing/manufacturing constraints, including for test coupons.
5. Continue with the returned `boardRef`, `revision`, and private `url`. Pass the same reference to reads, edits, status polls, checks, previews, and exports. Creation also lays out the board: the call waits for the layout and its check and returns the finished board. If the result has `pollAfterSeconds` instead, the layout is still running; follow its `generation` with `get_generation` instead of calling `generate_layout`. A saved schematic and a completed layout are still different outcomes: report the layout only when `layout.current` is true.

### Create a board from published parts

Parts are string arrays `[id, dbId, value]`, with an optional fourth `designator` when the printed label differs from `id`. The first `id` is your instance identity within this board; `dbId` is the selected returned part's catalog `id`, from `search_parts` or `get_part`. The required third item is its value/display label. Connections contain `net`, `class` (`power`, `signal`, or `ground`), and `pins`. Each connected pin is exactly `[partId, padId]`: use the instance ID and the chosen returned `pins[].number`, both strings. Do not use a pin's display name or array index as its pad ID. Firmware pin labels describe signals; map them to the verified catalog pins.

This two-resistor coupon uses the published Yageo RC0603FR-0710KL, a 10 kΩ 0603 resistor. Call `get_part` with `{ "id": "69bdbb02b86ba86cb74b6b68" }`. Bind its returned `data` to `resistor` and verify the MPN and pins `"1"` and `"2"`. Send these arguments to `create_board` with the private `boardRef` and fresh UUID `requestId` generated in step 4. Guest and signed-in calls use the same arguments.

```js
const createArgs = {
  boardRef,
  requestId,
  name: "Two-resistor coupon",
  intent: {
    parts: [["first", resistor.id, "10k", "R1"], ["second", resistor.id, "10k", "R2"]],
    connections: [
      { net: "IN", class: "signal", pins: [["first", "1"], ["second", "1"]] },
      { net: "OUT", class: "signal", pins: [["first", "2"], ["second", "2"]] },
    ],
  },
  boardEdits: {
    settings: { width: 26, height: 22 },
    fixedPlacements: { upsert: [
      { partId: "first", x: 12, y: 7, rotationDeg: 0, side: "top", designator: "above" },
      { partId: "second", x: 12, y: 15, rotationDeg: 0, side: "top", designator: "right" },
    ] },
  },
}
```

For an exact position, omit `designator` on the corresponding placement and include a `silkscreenTexts.upsert` item. For example, `{ id: "refdes_second", x: 12, y: 15 }` puts R2's text on the centre of its footprint. A successful save preserves those coordinates and returns a `designator_placement` issue in `data.placementIssues`. If the position must remain exact, show the user the saved board and explain the overlap. If you chose the position and the issue lists `below` as a free side, the following `update_board` arguments move only R2's label. Here `saved` is the returned board data for the current revision and `nextRequestId` is a fresh UUID.

```js
const updateArgs = {
  boardRef: saved.boardRef,
  expectedRevision: saved.revision,
  requestId: nextRequestId,
  boardEdits: { fixedPlacements: { upsert: [{ partId: "second", designator: "below" }] } },
}
```

Read the result's `placementIssues`. A clean board omits the field. If a layout completed in the meantime, get the latest revision from `get_board` before applying the correction.

## Place the board

Nothing is placed or sized automatically. The layout job routes the board exactly as it is placed, so `boardEdits` carries the placement:

- `boardEdits.settings`: `width` and `height` in mm. A circle uses `outlineKind: "circle"` with `diameter`. A rectangle has corners rounded to a 2 mm radius unless `roundedCorners` is `false`. `layers` defaults to `auto`: the layout chooses one or two copper layers and saves its choice as the board's `layers`, which later layouts keep until you set `layers` again.
- `boardEdits.outline`: any other shape, in place of `width` and `height`. `{ kind: "dxf", source }` reads a board outline from an ASCII DXF file sent as text: its closed outline becomes the board edge and closed shapes inside it become cutouts. Add `unit` (`mm`, `in` or `mil`) when the file declares none and `layer` when several layers hold outline geometry; an issue names the field to set, the board size each unit would give and the layer with the largest outline when one stands out. `{ kind: "generated", profile }` states the same geometry as lines and arcs in mm, and `{ kind: "library", id }` picks a shape listed in `get_board` under `physicalContext.outlineLibrary`. An imported outline is converted to mm and moved so the lower-left corner of its bounding box is the board origin; `settings.customOutline` in the result is the outline as saved.
- Put each part in `boardEdits.fixedPlacements.upsert`. For example, `{ "partId": "R1", "x": 8, "y": 12, "rotationDeg": 90, "side": "top", "designator": "above" }` prints R1 just above its rotated footprint in board coordinates. Choose a free side for each label (`above`, `below`, `left`, or `right`). An end such as `above-left` aligns the label with the left end of the upper edge. A mounting hole still needs a placement and can omit `designator`. Part coordinates locate the footprint origin in mm from the lower-left corner of the board's bounding box, with x right and y up. Rotation is counterclockwise. `side` selects the top or bottom board face.
- For an exact label centre, use `{ "id": "refdes_R1", "x": 8.3, "y": 14 }` in `boardEdits.silkscreenTexts.upsert` and omit `designator` on that placement. The ID uses the instance's `partId`, even when its printed reference differs. The service supplies the printed reference, board face, and 1 mm text height.

Place from measured geometry, not estimates. Catalog results that carry pins also carry `geometry` in mm at rotation 0 on the top side, x right and y up from the footprint origin: `body` `[width, height]`, `extent` `[minX, minY, maxX, maxY]` of everything the footprint occupies, `pins` `{ number: [x, y] }`, and a connector's `opening`. Call `get_part` when a chosen part has no geometry. Rotate these numbers with the part.

- Keep every extent inside the outline with 1 mm to spare and 1 mm from other extents, more where traces must pass. An extent in a corner must clear the rounded corner too. An external receptacle (USB, jack, terminal block) sits at a board edge with its opening outward.
- Put connected parts next to each other with their connected pins facing, and support parts at the pins they serve.
- A designator counts as 0.8 mm per character wide and 1 mm tall. Keep it at least 0.2 mm outside every part's extent, 0.3 mm inside the outline and 0.2 mm from other labels, within 3 mm of its own part and at least 0.3 mm nearer to it than to any other part. Each distance is measured from the box the text covers to a part's extent, not between centres.
- Size the board to the arrangement.

A rejected create with `designator_required` needs a position for each named label. Correct the original arguments and resend with the same `boardRef` and a fresh `requestId`.

A successful create or edit can return `placementIssues` identifying the affected `partId` and `labelId`. To improve a saved `designator_placement`, choose a value from `suggestedSides` or use the exact centre from `suggestedPosition` when provided. On a switch to a named side, omit the old label coordinates from the outgoing edit. Choose separate positions for competing labels. If no position fits, report the part or obstacle that needs more room before changing any user-specified placement. Preserve unrelated placements.

When more than 12 labels have issues, `placementIssueCount` gives the total and `placementIssues` shows the first 12. Apply the intended corrections from that batch together in one `update_board`, then read the new revision for the remaining labels. Keep any exact positions the user asked to retain.

## Clearances, keepouts, and pin currents

Use these fields only when the live tool schema advertises them. Read `get_board` first when editing an existing board and retain unrelated settings.

- `boardEdits.partClearances`: `upsert` by `partId`, or `remove` by part ID. A new item needs `clearanceMm` (`front`, `back`, `left`, `right` in mm), `linked`, `restrictions`, and `copperLayers`; `enabled` defaults to true. Directions use the part's local frame. Linked distances must match.
- `boardEdits.keepouts`: `upsert` by `id`, or `remove` by ID. A new item needs `name`, `x`, `y`, `rotationDeg`, `shape`, `restrictions`, `partSide`, and `copperLayers`. Use rectangle, circle, or custom-profile geometry from the schema. Coordinates are board-plane mm. Both controls use `restrictions: { parts, tracks, vias, copperFills }`; choose actual board layers. Omitted item fields stay unchanged; supplied nested objects replace the whole nested value.
- `intent.pinCurrentRequirements`: entries identify a verified `partId` and `padId`, with nonnegative `requiredCurrentA` in amperes and `direction` (`into`, `out`, or `bidirectional`) relative to the net's copper. Omitting the list preserves existing valid pin requirements; supplying a list replaces it, and `[]` clears it. Include every requirement to retain. Use per-pin values for new requests; the older connection-wide current field remains for existing boards.

For example, a verified input pin supplying half an amp into a net uses `{ partId: "J1", padId: inputPin.number, requiredCurrentA: 0.5, direction: "into" }`. This is one entry, not a complete replacement list; retain the other pins' requirements when updating it.

Read back the saved requirements from the save's result. The save waits for the layout that edit started and returns its check as `validation`; when the layout was still running, or `validation` is null, wait for it and run `check_board_layout` before reporting its compliance. Layout and scoring consume these requirements, but successful saving or generation alone does not prove clearance or current capacity. Report returned blocking issues and incomplete assessments without claiming unverified compliance.

## Revise, recover, and generate

Edit an existing board with `update_board` from the board the last save or read returned; read `get_board` first when you do not hold the current board. Preserve catalog identities, valid intent, and fields outside the request. Use the current revision as `expectedRevision` and a fresh UUID `requestId` for each new update or generation operation. A save returns the revision its finished layout saved. Only when a save answered while its layout was still running (its result has `pollAfterSeconds`) does the revision advance afterwards; then take it from `get_generation`'s `boardRevision` or a fresh `get_board`, not from that save. A revision conflict requires a fresh board read and reconciliation, not a blind overwrite.

For detailed validation errors, fix only the reported fields while preserving valid intent and the same board reference. Changed input needs a new `requestId`; retry unchanged input with its original ID and exact arguments. Never weaken hidden constraints to silence an error. An ambiguous response does not establish failure. Read the existing board or current job using its reference, or replay the exact original creation request if its result was lost. Do not create a fresh reference or replacement board. A reference already used for creation cannot create another board, even after logout or access retirement.

Every successful `create_board` or `update_board` that leaves the board without a current layout starts one, waits for it and for its check, and returns the board as it is afterwards, with the finished job as `generation` and the check as `validation`. Most saves end this way. When the result has `pollAfterSeconds`, the layout is still running: use `get_generation` for that exact `generation.id` and follow `pollAfterSeconds`. If the ID was not retained, omit it and use the same `boardRef` to read the latest job. `get_board` also exposes the current generation and whether the saved layout is current. Stop polling at completed, failed, or cancelled. After completion, use the returned `boardRevision`, or read `get_board` for the saved revision and preview, before checking or exporting. An edit made while a layout is running replaces that job with one for the edited board; follow the new `generation`.

Call `generate_layout` only to retry: after a failed or cancelled job, or when a save returns `layoutNotStarted` (wait any `retryAfterSeconds` first). It waits for the job as a save does and returns it completed with the new `boardRevision`, or still running with `pollAfterSeconds`; its result carries no check, so run `check_board_layout` afterwards. If a layout of that revision is already running or was just saved, it returns that job instead of starting another. A timeout is a reason to read status, not to start another generation. Reusing a generation request ID with a newer revision is changed input and correctly conflicts. `stop_generation` is for a user-requested stop.

## Check and export

When reviewing a layout or preparing a manufacturing ZIP, use the `validation` a save or `get_board` returned for the current revision, and call `check_board_layout` when it is null. `validation` reports `hasBlockingIssues` and actionable `blockingIssues`; report those issues or say that no blocking issues were found. Numeric scores and deductions are not exposed. A null `validation` means the board has no current assessment, not that it passed; generate a fresh layout if needed and run the check. An unavailable check is not a pass or permission to substitute another tool.

Use `export_board` with the latest saved revision, as the last save or `get_board` returned it. For an editable backup (`format: "egb"`), export the valid saved project directly, including projects with missing, incomplete, or stale layouts. Do not generate a layout or run `check_board_layout` solely for an EGB export; exporting a backup does not establish manufacturing readiness. Manufacturing ZIPs require current PCB geometry and electrical requirements: generate or refresh the layout if needed, then use the saved revision and make sure the layout is checked before exporting.

A successful manufacturing export can carry `placementIssues`. Give the user the requested download and identify any affected reference labels. Keep any exact positions the user requested.

New exports require current board access and remain subject to document validation and size limits. Return each requested artifact link, or download the file to the user's requested destination. At the first guest board handoff and alongside its export, present the returned `saveToAccount.label` linked to `saveToAccount.url` so the user can find the design later from My Boards. A single link is enough when the preview and save offer share the same URL. Keep the download link separate. On older servers, use the original private viewer link when available. Stable private download links have no automatic expiry and return the exact exported snapshot, including after board edits or deletion, guest claim, and guest cleanup. Preserve returned links exactly, including their capability fragment. The download page refreshes temporary storage authorization automatically. Only explicit download-link revocation or deletion of the exported file ends access. An unavailable download is not permission to bypass revocation or silently export a different revision. Do not infer that exporting orders a physical board.

Follow the connected service's advertised behavior. Do not promise that an unavailable historical link can be restored.

A stable link opens a browser download page; fetching that page directly returns HTML, not the exported file. For a user-requested local download, a nonbrowser client can read the link's fragment token in memory, then POST JSON `{ "token": token }` to `/api/downloads/{artifactId}` on the same origin as the returned link, with `Content-Type: application/json` and `Origin` set to that origin. The response contains `name` and a temporary storage `url`; download that URL unchanged to the requested destination. Do not put tokens or signed URLs into command history, diagnostics, analytics, or public output. Request another storage URL from the same stable link if needed; do not regenerate the board or export a different revision.

## Private references and account access

The same `boardRef` identifies the board and supplies its private continuation capability where anonymous access is supported. It is not a public board UUID, request ID, IP address, or visitor identity. Copy references returned by the service unchanged; account-list references are opaque and still require the owning account's authorization. Do not parse a reference to infer ownership or broaden access.

Keep the reference in private tool arguments/results or supported secure host state across turns. Do not echo it to the user, write it to source files, or include it in analytics, diagnostic logs, or support requests. When orchestrating tools in an isolated execution, preserve the reference for the next execution instead of discarding it after a success summary. Do not invent host storage support or assume local variables survive. If the host loses the reference and the original creation request, explain the limitation; the service cannot reconstruct private access from public identifiers. The returned private viewer link is the user-facing exception needed to return to the board. Anyone with a complete private viewer or download link can use its granted access; do not shorten it through an external service or make it public.

For a lost first response, replay the exact original `create_board` request with the same reference and request ID. This recovers its original result without another board or trial. Once creation is known, use ordinary reads and edits with that reference. Retired, invalid, revoked, or unavailable access must never cause automatic replacement work. An anonymous `list_boards` cannot discover an earlier private reference or establish that an account has no boards.

When the user wants to keep this private board in their account, use the host's normal OAuth flow, then continue with the same reference. Call `save_board_to_account` with authorized write access to save the board into that personal account; `get_board` and other reads never do. Confirm the save with the returned account board link. Use the returned state, `id` and revision for further edits. Saving preserves the reference, but anonymous access to the claimed board ends. The saved board remains subject to its actual owner's permissions. A different signed-in account cannot take over an already claimed or account-owned board. `get_generation` and `stop_generation` retain their job behavior and do not save the board. The saved account copy preserves the layout, not the old generation history; after the save, `get_generation` may return no job while `get_board` still reports a current saved layout. Do not regenerate merely to recreate job history.

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
