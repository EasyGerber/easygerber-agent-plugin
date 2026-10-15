# Board workflow

The server tool schema is authoritative for field names, allowed settings, required scopes, and result shapes. The integration exposes these capabilities:

| Purpose | Tools |
| --- | --- |
| Guest board access and account claim | `start_guest_session`, `claim_guest_board` |
| Personal account and organizations | `get_profile`, `list_organizations` |
| Published component selection | `search_parts`, `get_part` |
| Saved boards and schematic revisions | `list_boards`, `get_board`, `create_board`, `update_board` |
| Layout jobs | `generate_layout`, `get_generation`, `stop_generation` |
| Layout blocker checks and manufacturing artifacts | `check_board_layout`, `export_board` |

## Guest trial and account claim

For a new board, finish any pending guest claim, then reuse the task's existing guest session or established account authorization. When neither is established, call `start_guest_session` using its current schema without first calling `get_profile` or `list_organizations`, including in parallel. Those account-only tools can prompt for sign-in before a guest can start. The ordinary tool error `account_connected` means an account is already authorized and no guest session was created; continue with that account, using `get_profile` only if needed for account work. A real OAuth or permission failure still requires the normal reconnect or permission flow; never remove credentials or downgrade to guest access.

A successful `start_guest_session` returns `guestToken`, `expiresAt`, `limits`, and `viewerUrl`. Retain these for this task. `expiresAt: null` means no scheduled expiration, and `limits: { boards: 1 }` allows one guest board with no lifetime caps on edits, layouts, checks, previews, or exports. Starting a session is not an idempotent recovery operation: each successful call creates a new session and cannot recover a lost one. If its response is lost or ambiguous, stop and explain the uncertainty; do not repeat the start automatically. Reuse an existing session and board-operation request IDs after ambiguous board-operation failures; do not start another session to bypass the board limit, a denial, or service protections. The board limit is per session, not a promise of one verified trial per person. Guest support in a server schema does not prove support in every client.

Pass `guestToken` in supported tool arguments. It authorizes this guest session's catalog access and board workflow, not private account boards or organizations. Do not send an organization ID for guest work. Guest mode supports saving one board, app-supported edits, layout, blocker checks, preview, and both manufacturing ZIP and EasyGerber exports before signup. The server's returned limits and nullable expiry are authoritative. Normal request-rate, complexity, and shared compute protections still apply; follow any retry guidance without changing identities or requiring signup to continue editing the same guest board. `guest_session_required` means a new trial can start if that matches the user's request. `guest_session_unavailable` can mean invalid, revoked, claimed, or an expired finite legacy session; it is not permission to replace the session automatically. Do not invent a deadline or renewal for a null expiry.

Treat the guest token as a private capability. Do not print it, put it in a repository, add it to a commit, or record it in analytics or diagnostic logs. Keep it in the tool context, and give the user only the private viewer link returned by the service when they need to inspect or return to their board. Anyone with that link can access the guest board, and losing the capability/link prevents guest recovery. Do not shorten the link through an external service or make it public. Download links are private and expire separately after fifteen minutes; export objects become eligible for cleanup after twenty-four hours. Neither artifact timer expires the guest board.

When the user chooses sign-in or account work while this task has a guest board, save it to their personal account automatically as part of that transition. Call `claim_guest_board` with the original `guestToken` to initiate the client's normal OAuth flow, then retry the same claim immediately after authentication resumes with authorized `boards:write` access. Normal account consent is sufficient; do not ask a separate “Keep board?” question, wait for another save request, or call `get_profile` and leave the guest board unclaimed. If the user signs in through generic native Settings **Authenticate**, resume this pending claim when the agent continues: that callback has no guest-board context and cannot by itself guarantee an immediate save. Signing in from the private guest viewer saves the board through that viewer's account flow. Merely opening a guest preview in an already signed-in browser does not transfer it; do not treat that view as an account transition.

Claiming copies the saved design into personal account ownership and returns a new board ID. Retain that ID, use the account board link, and call `get_board` without a guest token to read its current state and revision before any further writes. Successful claim revokes the old guest token and viewer session; do not use the guest ID as the account board ID. Retain the original token until the claim result is known. A failed or interrupted claim must preserve it for retry; repeating the same claim for the same account is safe even if the first response was lost. Never create a replacement guest session or board to recover a pending claim. If guest access is unavailable, explain the result without promising restoration; locally downloaded exports are separate files the user can keep.

Finish polling an active guest layout before switching the MCP connection to OAuth. If a claim returns `guest_board_busy`, keep the original capability, wait for the existing job to finish, and automatically retry the same claim, following any retry guidance without rapid polling. Do not cancel the layout to complete the save, ask the user to retry manually, disconnect the account, or mix credentials to regain guest polling. The private viewer can refresh the saved board but does not report job progress.

Other account tools may return `authentication_required`; use the client's normal OAuth flow for account work without an existing guest board. If an expired or invalid account credential is rejected, reconnect the account; never downgrade it to guest access. Once an account is authorized, only `claim_guest_board` receives the original guest token to transfer that board. Omit guest tokens from ordinary account calls; mixing credentials is rejected as `conflicting_credentials`. Account ownership provides account-based recovery and additional boards under normal plan limits; signup is not required merely to prevent a guest board from expiring.

## Create from firmware or requirements

1. Identify the board requirements and use the existing guest session or authorized account ownership. For account work, use an organization only when requested; otherwise use personal ownership. Read only relevant firmware files to map hardware pin names to signals. Distinguish firmware-defined choices from missing electrical requirements.
2. Search the published catalog and use `get_part` to confirm part identity, available pin data, electrical compatibility, essential supporting circuitry, and the requested connector form factor. Firmware pin labels describe signals; map them through real catalog pins. When no suitable published part exists, explain the missing capability and ask about an acceptable published alternative.
3. Submit the thin schematic using the live `create_board` schema: catalog part references, instance identities, connections, and visible settings. Include a fresh UUID `requestId` for the operation; retain it for any retry of the same unchanged request. The server resolves component geometry, models, and routing constraints. This also applies to test coupons.
4. Retain the saved board ID and revision. If layout generation is requested, call `generate_layout` and retain its job ID. Report a saved schematic separately from a completed layout.

The compact intent format for `create_board` and `update_board` uses string arrays for parts: `[id, dbId, value]`, with an optional fourth `designator` when the printed label differs from `id`. `id` identifies the instance in this design; `dbId` is the published catalog ID returned by `get_part`; the required third item is the value/display label. Connections are objects with `net`, `class` (`power`, `signal`, or `ground`), and `pins`; each pin is exactly `[partId, padId]`, both strings. Use this format even if the host renders nested tool fields as `unknown`; the live schema remains authoritative.

For example, this intent connects two verified connector pads. `inputConnector` and `outputConnector` are the `data` objects returned by `get_part`, and `inputPadId` and `outputPadId` are their verified string pad IDs:

```js
const intent = {
  parts: [
    ["J1", inputConnector.id, "Input"],
    ["J2", outputConnector.id, "Output"],
  ],
  connections: [
    { net: "SIGNAL", class: "signal", pins: [["J1", inputPadId], ["J2", outputPadId]] },
  ],
};
```

## Revise and generate

Read `get_board` before `update_board`. Preserve component/catalog identities and fields outside the requested change. Pass the returned board revision as `expectedRevision` and a UUID `requestId` for a new update or generation operation. Reuse that request ID only when retrying the identical operation. If the tool rejects a revision, retrieve the current board and reconcile before submitting a new request. On validation errors, correct the reported input rather than weakening hidden constraints.

After `generate_layout`, use `get_generation` with the returned ID and follow any suggested polling interval. Stop polling when completed, failed, or cancelled; do not loop rapidly. After completion, call `get_board` to read the saved revision and preview before checking or exporting. `stop_generation` is for a user-requested stop or an explicitly superseded job. A timeout does not establish failure: inspect the known job before resubmitting.

## Check and export

Use `check_board_layout` to check the saved layout. Its `validation` reports `hasBlockingIssues` and actionable `blockingIssues`; report those issues or say that no blocking issues were found. Numeric scores and deductions are not exposed. A null `validation` on a board read means it has no current assessment, not that it passed; generate a fresh layout if needed and run the check. Use `export_board` for the manufacturing files the user asks for. Link returned artifacts or download them to a user-requested local destination using the host's tools. Export links may expire; request a fresh export if needed. Do not infer that exporting orders a physical board.

## Permission and limits

For account access, the scopes are `boards:read`, `boards:write`, `boards:generate`, and `boards:export`. Authorization does not bypass organization membership, the existing plan, quotas, or compute limits. Guest access permits one board with no lifetime operation caps; request-rate, complexity, and shared compute protections remain. If a tool returns an authorization, rate, admission, or unsupported-setting error, explain the concrete restriction and next step. Do not change ownership or credentials to work around it. Keep private board content, guest viewer links, and signed download URLs within the user's task.
