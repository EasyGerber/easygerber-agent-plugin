# Board workflow

The server tool schema is authoritative for field names, allowed settings, required scopes, and result shapes. The integration exposes these capabilities:

| Purpose | Tools |
| --- | --- |
| Personal account and organizations | `get_profile`, `list_organizations` |
| Published component selection | `search_parts`, `get_part` |
| Saved boards and schematic revisions | `list_boards`, `get_board`, `create_board`, `update_board` |
| Layout jobs | `generate_layout`, `get_generation`, `stop_generation` |
| Assessment and manufacturing artifacts | `score_board`, `export_board` |

## Create from firmware or requirements

1. Identify the board requirements and whether the user requested an organization owner; otherwise use personal ownership. Read only relevant firmware files to map hardware pin names to signals. Distinguish firmware-defined choices from missing electrical requirements.
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

After `generate_layout`, use `get_generation` with the returned ID and follow any suggested polling interval. Stop polling when completed, failed, or stopped; do not loop rapidly. `stop_generation` is for a user-requested stop or an explicitly superseded job. A timeout does not establish failure: inspect the known job before resubmitting.

## Check and export

Use `score_board` to check the saved layout. Its `validation` reports `hasBlockingIssues` and actionable `blockingIssues`; report those issues or say that no blocking issues were found. Numeric scores and deductions are not exposed. A null `validation` on a board read means it has no current assessment, not that it passed; generate a fresh layout if needed and run the check. Use `export_board` for the manufacturing files the user asks for. Link returned artifacts or download them to a user-requested local destination using the host's tools. Export links may expire; request a fresh export if needed. Do not infer that exporting orders a physical board.

## Permission and limits

The scopes are `boards:read`, `boards:write`, `boards:generate`, and `boards:export`. Authorization does not bypass organization membership, the existing plan, quotas, or compute limits. If a tool returns an authorization, quota, or unsupported-setting error, explain the concrete restriction and next step. Do not change ownership or credentials to work around it. Keep private board content and signed download URLs within the user's task.
