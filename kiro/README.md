# EasyGerber for Kiro

AI PCB design, layout, and routing

This power connects Kiro to EasyGerber's production service and includes the EasyGerber board workflow. Describe a circuit or start from firmware pin assignments, select published components, revise schematics, generate layouts, and request manufacturing exports. The package contains instructions, connection metadata, and artwork. PCB placement, routing, and scoring run exclusively on EasyGerber's servers.

## Install

Use the [Kiro power folder in the public repository](https://github.com/EasyGerber/easygerber-agent-plugin/tree/codex/agent-plugin/kiro). In Kiro, open **Powers → Add Custom Power** and import that GitHub folder, or choose **Import power from a folder** after downloading the repository and select its `kiro` folder containing `plugin.json`.

From a local checkout of the public repository, Kiro CLI V3 supports:

```sh
kiro-cli --v3 powers install ./kiro
kiro-cli --v3
```

Use an authenticated Kiro session with an available model. Kiro/model usage has its own plan limits and charges. The repository's npm installer configures Codex only and is not needed for Kiro.

Ask Kiro to activate the EasyGerber power for AI PCB design. Kiro discovers `skills/easygerber/SKILL.md` and manages the power's MCP connection internally. The skill includes the complete workflow so that Kiro can read it without resolving a separate reference file. Native server and tool names may have a prefix; inspect the names shown by `/mcp`. A power-managed connection need not appear in the user-level MCP settings file. Avoid duplicate connections.

For an installation check without creating or changing anything, use:

> Activate the EasyGerber power for AI PCB design. Read its installed skill and complete workflow, and report the available EasyGerber tool names. Do not call any EasyGerber tool, create a guest session, authenticate, create or change a board, generate a layout, export anything, or send feedback.

## Guest and account access

The power uses Streamable HTTP at `https://www.easygerber.com/api/mcp`. A fresh connection can initialize and discover tools without an EasyGerber account, OAuth grant, or API key. Discovery does not create a guest session or perform board work.

For user-requested board work, the hosted service supports one guest board per session before signup. Follow the [workflow included in the skill](skills/easygerber/SKILL.md#board-workflow), select published catalog components with their actual pins, footprints, and available 3D models, and use app-supported settings. Keep guest tokens and private viewer links private. The skill covers saved revisions, asynchronous layout, previews, blocker checks, manufacturing exports, and saving a guest board to an account after consent.

Saved account boards require EasyGerber OAuth consent. For Kiro CLI 2.32.0 V3, use the optional account connection below. The power's automatic account authorization during an active guest task did not complete in the tested session: two callbacks returned `InvalidRequest` with the message "authorization request expired or already completed." The native listener was still active; the cause of that authorization-state error was not established. Authenticating the public endpoint from `/mcp` only reset its guest connection because that endpoint permits unauthenticated discovery. The separately configured account entry completed authorization and successfully saved the existing guest board to the account.

### Optional account connection and guest-board saving

Use `https://www.easygerber.com/api/mcp/account` for account work. This is a separate OAuth resource; preserve the power's guest connection and do not copy credentials between them. No fixed client ID, secret, or manual scope override is needed for the tested account-first flow.

1. Finish any running guest layout and keep the current conversation, which holds the original guest capability. Do not start a replacement guest session or paste its token into chat or a settings file.
2. In the workspace's `.kiro/settings/mcp.json`, merge the following named entry into the existing `mcpServers` object, preserving all other servers and settings. If this account endpoint is already configured, inspect and use that connection instead of duplicating it. Keep tool approval enabled.

```json
{
  "mcpServers": {
    "easygerber-account": {
      "url": "https://www.easygerber.com/api/mcp/account",
      "autoApprove": []
    }
  }
}
```

3. Restart Kiro in the same workspace and resume the guest-board conversation. `kiro-cli --v3 chat --resume` resumes the most recent conversation in that directory. If it is not the intended conversation, use `kiro-cli --v3 chat --list-sessions` and `kiro-cli --v3 chat --resume-id <session-id>` to resume the correct one. The validation used the explicit session ID. A restart was needed before the added connection appeared in the tested session.
4. Use `/mcp` to inspect the account connection and start its normal authentication flow if required. Complete EasyGerber sign-in and consent; an existing valid authorization for this account endpoint may be reused by Kiro. Verify the account server is running and advertises the EasyGerber tools. The guest power and account connection may both be listed.
5. Ask Kiro to save the guest board through the account connection, using the original guest token already retained in the resumed conversation. It must call `claim_guest_board` on the account connection and then read the returned account board ID without a guest token. A successful claim ends access through the old guest capability. Do not create another board or treat signing in alone as confirmation of the save.

For example:

> Save the guest board from this conversation to my personal EasyGerber account using the easygerber-account connection. Use the original guest capability for the claim, then read the returned account board without guest credentials to confirm the saved design. Do not create a replacement board.

If the original capability is no longer available in the conversation, stop and explain that limitation rather than starting another guest session. For later account-board work, use the account connection and omit guest credentials from ordinary tools.

Complete the browser consent while Kiro is still waiting. In an earlier test of the account endpoint, the local callback listener expired after about 60 seconds and the browser reported a refused connection; renewing that account authorization flow succeeded. This was separate from the power's mid-session `InvalidRequest` error while its listener was active. A return to `localhost` is the native Kiro app on the same computer, distinct from EasyGerber's hosted service. If the browser reports a refused local connection after a delay, restart Kiro's normal authentication flow and complete it while the new listener is active. Keep the actual callback destination inspectable; do not send codes or tokens in chat.

Ordinary account scopes are `boards:read`, `boards:write`, `boards:generate`, `boards:export`, and `offline_access`. Deletion requires a separate explicit request and separately approved `boards:delete` access; ordinary board permission is insufficient. Account authorization does not bypass organization permissions, quotas, or billing.

## Verified behavior and remaining limits

On October 18, 2026, Kiro CLI 2.32.0 with its V3 harness imported and explicitly activated this power, loaded the complete 24,194-byte skill including every workflow section, and discovered 17 production tools without EasyGerber authentication. A native guest workflow then searched and inspected two published catalog resistors, created a board, read and renamed it, completed layout generation, read the saved board with preview data, checked the layout with no blocking issues, and exported both manufacturing and EasyGerber files. One malformed generation request ID was rejected before an operation started; the agent corrected it and one valid job completed.

A separate native configuration for `/api/mcp/account` requested the ordinary board scopes above without deletion, completed OAuth with S256 PKCE, and connected with 17 tools. Its successful callback was bound to the local loopback address. After that account connection was added to the guest workspace and the same conversation was resumed, Kiro retained the original guest capability and successfully called `claim_guest_board` through the account connection. It then read the new personal account board without guest credentials, confirming the saved layout and available preview data. A separate browser check rendered the claimed board's two published 3D resistors and showed no pending changes. This validates the explicit account-connection path above; it does not establish automatic account upgrade through the power alone.

The runtime manifests, skill, reference, license, and artwork match the native-tested package; this README records the completed results. Export tool receipts were verified; the artifact files were not downloaded. Deletion, feedback, token refresh, and keyword-only automatic activation remain untested in Kiro. The tested board used app-supported settings and published parts; no existing boards were modified, and no board was deleted or fabrication purchased. These checks do not establish Kiro directory approval or a safety certification of a design.

The manifests use the standard Agent Plugins 1.0.0 schemas without the root integration's OpenAI-specific metadata. Maintainers generate this folder from canonical sources; the standalone workflow reference remains included for readers. The other clients' configurations are preserved.

## Privacy and support

Send only the board requirements, selected components, schematic changes, identifiers, and explicitly approved feedback needed for the user's task. Do not upload unrelated repository content, credentials, or diagnostics. The hosted service retains agent activity analytics for one year. This declarative package has no executable installer, local engine, lifecycle hook, or telemetry code.

- [Integration documentation and support](https://www.easygerber.com/agents)
- [Privacy policy](https://www.easygerber.com/privacy)
- [Terms](https://www.easygerber.com/terms)
- [Public connection and support issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues) — omit private designs and credentials.
- Kiro [power installation](https://kiro.dev/docs/powers/installation/) and [power authoring](https://kiro.dev/docs/powers/create/) documentation.

The integration instructions and assets are MIT-licensed; see [LICENSE](LICENSE). The hosted EasyGerber service and its server engine implementations remain proprietary.
