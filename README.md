# EasyGerber: AI PCB design, layout, and routing

[![Installer smoke tests](https://github.com/EasyGerber/easygerber-agent-plugin/actions/workflows/installer.yml/badge.svg)](https://github.com/EasyGerber/easygerber-agent-plugin/actions/workflows/installer.yml) [![npm version](https://img.shields.io/npm/v/@easygerber/agent-plugin)](https://www.npmjs.com/package/@easygerber/agent-plugin) [![Plugin license: MIT](https://img.shields.io/badge/plugin%20license-MIT-blue)](https://github.com/EasyGerber/easygerber-agent-plugin/blob/HEAD/LICENSE)

This package connects coding agents to EasyGerber's hosted board-design tools. Its public files contain workflow instructions, connection metadata, icons, and a small installer. Board layout, routing, and scoring run on EasyGerber's servers.

Version 0.3.10 makes saving a guest board to an account an explicit `save_board_to_account` step; reading a board never saves it. The package uses one private board reference for creation and continued work. The service selects account ownership or private access automatically, exposes the current layout job for status reads, and preserves existing-client compatibility. Ordinary OpenAI sign-in explicitly requests only workflow permissions; deletion remains a separate consent. Hosted tools and package instructions must both be current; package checks alone do not establish a live client workflow.

Source is available in the [public integration repository](https://github.com/EasyGerber/easygerber-agent-plugin). The npm installer and platform plugin packages have separate client-validation processes and share the EasyGerber workflow skill and hosted service.

## Start without signing up

Use **`https://www.easygerber.com/api/mcp`** to search published parts and create a board without signing up. The agent uses one private `boardRef` for creation, edits, layout, checks, previews, and exports. The service uses the connected account when valid or establishes private access automatically. There is no user-facing guest setup or separate token to manage. Keep the private board link out of public messages and repositories.

| Connection URL | When to use it | Sign-in |
| --- | --- | --- |
| `https://www.easygerber.com/api/mcp` | General MCP connections and guest-first directory listings | Not required for guests; required for account boards, organization access, and saving a guest board to an account |
| `https://www.easygerber.com/api/mcp/account` | Saved account boards in clients that request OAuth only during setup | Required before initialization or tool discovery; this connection does not start in guest mode |

The Codex installer, OpenAI packages, and Claude package use the general URL. The Grok account connector and native Cursor and Antigravity configurations below use the account-only URL. For a new guest connection, leave authentication unset; a rejected existing account credential must be reauthorized and will not silently become a guest connection. See **Create and continue without signing up** for private access and account transitions.

## Grok

Connect your EasyGerber account once to open and edit saved boards in consumer Grok:

1. In Grok, open **Plugins → New Connector → Custom**.
2. Name the connector **EasyGerber** and enter `https://www.easygerber.com/api/mcp/account` as the server URL.
3. Complete EasyGerber sign-in and choose **Allow access**. Then ask Grok to open a saved board by its EasyGerber URL and make your requested changes.

For example: “Open this saved EasyGerber board: [your board URL]. Rename it to LED indicator and read it again to confirm the change was saved.”

This account entry requires authorization during connection setup and uses the existing EasyGerber tools and account permissions. For a new connection to the account entry, complete its normal sign-in flow. Existing published package configurations continue to use `/api/mcp`, which supports guest use and optional account authorization.

On October 16, 2026, consumer Grok completed consent, read an existing private saved board, saved a temporary name change, and restored the original name. Both changes were confirmed after reopening the board on the EasyGerber website. Grok Bot has not been tested. Browser 3D rendering was not verified because WebGL was unavailable in the test browser. This consumer check does not establish Grok Build's interactive OAuth or model-driven board workflow.

## Cursor

The public repository includes a native `.cursor-plugin/plugin.json` manifest. It uses the shared EasyGerber skill and artwork and connects to `https://www.easygerber.com/api/mcp/account`. This entry requires account authorization before tools become available; complete EasyGerber sign-in and choose **Allow access** in Cursor's connection flow. Account permissions, plan limits, and generation billing still apply.

To load a checkout of the public repository in the official Cursor CLI:

```sh
agent --plugin-dir .
```

Enter `/mcp`, select **Easygerber (plugin)**, and choose **Manage Server → Login** to complete the browser consent flow. Then ask: “Open this saved EasyGerber board: [your board URL]. Read its current name and components.” Cursor manages the account credentials. The npm installer is not required; it configures Codex only. The root OpenAI and Claude connection configurations retain guest-capable `/api/mcp` access. Marketplace publication is subject to Cursor review.

## Antigravity

Design and lay out PCBs in Antigravity using published components, automatic placement and routing, schematic editing, and manufacturing exports. The public repository includes native Antigravity metadata and the shared EasyGerber skill. Its MCP connection uses `https://www.easygerber.com/api/mcp/account`; account permissions, plan limits, and generation billing still apply.

Install the plugin from the public repository with the current Antigravity CLI and start a session:

```sh
agy plugin install https://github.com/EasyGerber/easygerber-agent-plugin
agy
```

Use `/mcp` to inspect the EasyGerber connection. Complete EasyGerber sign-in and choose **Allow access** when Antigravity requests account authorization. Then ask: “Open this saved EasyGerber board: [your board URL]. Read its current name and components.” Antigravity manages the account credentials. The npm installer is not required. Marketplace publication is subject to Antigravity review.

See the official [plugin guide](https://antigravity.google/docs/plugins) and [MCP guide](https://antigravity.google/docs/mcp).

## Cline

Cline can connect directly to EasyGerber's hosted MCP endpoint using Streamable HTTP. Use an existing Cline installation with a configured model. The npm setup installer in this repository configures Codex only; it is not the Cline installation path. No local EasyGerber server, build, or API key is needed for a new guest connection.

In the Cline IDE panel, open **MCP Servers → Remote Servers**, enter **EasyGerber** as the server name and `https://www.easygerber.com/api/mcp` as the server URL, choose **Streamable HTTP**, and select **Add Server**. Leave authentication unset for guest access.

Alternatively, open **MCP Servers → Configure → Configure MCP Servers** and merge this entry into the existing `mcpServers` object, preserving other servers and settings:

```json
{
  "mcpServers": {
    "easygerber": {
      "type": "streamableHttp",
      "url": "https://www.easygerber.com/api/mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

The explicit `streamableHttp` type matters: omitting it selects legacy SSE in Cline. Keep tool approval enabled. If `easygerber` already exists, inspect that entry instead of replacing it or creating a duplicate.

With the current Cline CLI, the equivalent configuration command is:

```sh
cline mcp add easygerber https://www.easygerber.com/api/mcp --transport http --yes
```

This command saves the connection; it does not by itself prove successful setup. In Cline, verify that the connection succeeds and EasyGerber tools such as `search_parts`, `get_part`, and `create_board` appear. For an installation-only check, stop after tool discovery; do not start a guest session, create or modify a board, generate a layout, export files, or send feedback.

For later user-requested board work, guest access supports one board per session before signup. Saved account boards require EasyGerber OAuth consent. Clients that require authorization during connection setup can use the separate `https://www.easygerber.com/api/mcp/account` entry described above. Account authorization and board workflows need their own Cline validation; the guest connection check does not verify them.

These instructions follow the official [Cline MCP guide](https://docs.cline.bot/mcp/mcp-overview). On October 18, 2026, Cline CLI 3.0.73 read the proposed README and wrote the native connection configuration into an empty isolated profile with tool approvals enabled. A separate check using its installed `@cline/core` 0.0.95 connected and discovered 17 EasyGerber tools without authentication. The agent itself did not verify discovery. No EasyGerber tool was called; OAuth and board operations were not tested.

## Kiro

Install the [Kiro power folder](https://github.com/EasyGerber/easygerber-agent-plugin/tree/main/kiro) through **Powers → Add Custom Power**, or run `kiro-cli --v3 powers install ./kiro` from a local checkout of this public repository and start `kiro-cli --v3`. The npm installer is not needed. The power uses the guest-capable `/api/mcp` entry and includes the complete EasyGerber workflow in its skill.

On October 18, 2026, Kiro CLI 2.32.0 V3 imported and explicitly activated the power, read its complete skill, and discovered 17 hosted tools without EasyGerber authentication. Its native guest workflow selected published parts, created and revised a board, completed layout generation, read preview data, checked for blockers, and exported manufacturing and EasyGerber files. A separately configured `/api/mcp/account` connection completed OAuth and successfully saved that guest board to a personal account after resuming the same conversation; a subsequent read confirmed the account board and its saved layout. A separate browser check rendered the saved board's 3D parts.

The power's automatic mid-session OAuth did not complete in this CLI version. Use the optional account connection and resume instructions in the [Kiro README](https://github.com/EasyGerber/easygerber-agent-plugin/tree/main/kiro#readme) for account work and guest-board saving. Complete browser consent while Kiro's local callback listener is active; an earlier account-endpoint attempt expired after about 60 seconds, separately from the power's mid-session authorization-state error. Token refresh, deletion, feedback, and keyword-only activation remain untested in Kiro. Directory approval is separate from these checks.

## Gemini CLI

Install the EasyGerber extension in the current [Gemini CLI](https://geminicli.com/docs/extensions/). Gemini's model sign-in is separate from EasyGerber: a new EasyGerber guest connection needs no account or API key.

```sh
gemini extensions install https://github.com/EasyGerber/easygerber-agent-plugin
gemini extensions list
gemini skills list
gemini mcp list
```

Review the extension's MCP connection and accept the normal installation prompt. Restart an existing Gemini session after installation. Confirm that the `easygerber` extension and shared skill are enabled and that the EasyGerber MCP connection is available. Existing user or workspace settings with the same server or skill name can take precedence over an extension; inspect them if the displayed connection or skill comes from another source.

The extension connects to `https://www.easygerber.com/api/mcp` using Streamable HTTP and loads the existing `skills/easygerber` workflow. It includes no local EasyGerber server or engine. Keep Gemini's normal tool approval prompts enabled. Try: “Use EasyGerber to create a board from the pin assignments in this firmware.” The agent selects published components and uses the guest workflow described above.

Verified with Gemini CLI 0.65.0: extension installation, shared-skill discovery, and an active MCP connection. A separate check using that installed CLI's MCP transport discovered 17 tools and completed guest-session creation, published-part search, and part lookup. This check did not exercise an interactive model session, board creation, layout, export, or account authorization.

For saved account boards or saving an existing guest board to an account, Gemini documents the interactive `/mcp auth easygerber` command. Complete EasyGerber consent, then resume the original task and guest-board claim if applicable. Guest discovery does not verify account OAuth, token refresh, or automatic authorization during a tool call. See [Gemini's MCP authorization documentation](https://geminicli.com/docs/tools/mcp-server/#oauth-support-for-remote-mcp-servers).

The extension is distributed through this repository and its dedicated Gemini release archive. To update an installed copy, run `gemini extensions update easygerber`. The `gemini-cli-extension` repository topic enables the gallery's daily discovery process; gallery indexing is separate from publication and is not Google endorsement or distribution in the consumer Gemini app.

## Devin

The public source export includes `.devin-plugin/plugin.json`, which connects to the guest-capable `https://www.easygerber.com/api/mcp` endpoint and loads the existing `skills/easygerber` workflow and artwork. Devin's own account sign-in is separate from EasyGerber authorization. A new EasyGerber guest connection needs no account or API key.

For local validation, use a checkout of the exported public integration repository with a signed-in Devin CLI:

```sh
devin plugins install --local .
devin
```

Start a new session after installation and use `/easygerber:easygerber` to load the workflow. Keep normal tool approvals enabled. For a minimal catalog check, ask: “Use EasyGerber to find a published two-pin connector and confirm its catalog pins. Do not create a board.” The agent uses the public catalog tools without starting a guest session or requesting account authorization.

On October 20, 2026, Devin CLI 3000.11.92 installed the generated local package and discovered its shared skill and hosted MCP configuration. A fresh native session using the Free account's available SWE-1.6 Slow model created one guest session, searched published connectors, and read a returned part to confirm its two catalog pins. No board creation, layout, export, or EasyGerber account authorization was tested. The earlier SWE-2 attempt required Pro and stopped before calling a tool; no paid upgrade was purchased. Marketplace review and listing remain separate from these native checks.

Devin documents `devin mcp login easygerber` for plugin OAuth connections. Account access, guest-to-account continuation, and board workflows need separate native validation; installing a plugin or listing tools does not establish those results. Marketplace submission and listing are separate from the shared package's release checks. See the official [Devin plugin guide](https://docs.devin.ai/cli/extensibility/plugins/overview).

## Factory Droid

Add EasyGerber's vendor marketplace and install the plugin in Droid:

```sh
droid plugin marketplace add EasyGerber/easygerber-agent-plugin
droid plugin marketplace list
droid plugin install easygerber@easygerber-agent-plugin --scope user
```

Read back the registered marketplace name with `marketplace list`; pinned sources can have a different name. This vendor catalog references the existing `claude/` package. Droid supports that layout and translates its metadata and MCP configuration while caching it. No local EasyGerber engine or npm installer is needed.

Use a configured Droid model and keep normal tool approvals enabled. Initial catalog access and a new board use `https://www.easygerber.com/api/mcp` without an EasyGerber account. Saved-account work requires separate EasyGerber consent and the permissions described below. Installing the plugin does not verify its account authorization or complete board workflow. Vendor-marketplace availability is separate from inclusion in Factory's own catalog. See the [official Factory plugin documentation](https://docs.factory.com/harness/plugins).

## Codex in VS Code or the terminal

Requires Node.js 22 or newer and Codex. These npm commands require version 0.3.10 to be published to npm; check `npm view @easygerber/agent-plugin version` first. If npm is behind the source release, use the [source installation instructions](#update-and-remove) below.

```sh
npx @easygerber/agent-plugin@0.3.10 setup --dry-run
npx @easygerber/agent-plugin@0.3.10 setup
npx @easygerber/agent-plugin@0.3.10 doctor
```

Setup installs `~/.agents/skills/easygerber` and adds a small managed MCP table to `$CODEX_HOME/config.toml` (default `~/.codex/config.toml`). It preserves existing TOML text and other servers. An ownership receipt lives in `~/.easygerber/agent-plugin/codex-install.json`. No project files or firmware are changed. Codex is the default and only installer target; optional `--client codex` makes that choice explicit. All commands support unattended use, and `--yes` is accepted for scripts.

Restart the Codex chat/IDE after setup, then ask: “Create a small 3.3 V LED board, show a preview, and export the manufacturing files.” The agent uses your connected account or starts a guest board automatically through `https://www.easygerber.com/api/mcp`.

For your saved account boards or organization work, connect EasyGerber from MCP settings. If Codex CLI is installed, run:

```sh
codex mcp login easygerber
```

The client opens the account authorization flow and stores its credentials. The managed MCP configuration requests `boards:read`, `boards:write`, `boards:generate`, `boards:export`, and `offline_access`, so account consent covers ordinary board workflows and renewable access, without deletion. The OpenAI plugin also sets these as explicit `defaultScopes`, overriding scopes otherwise inferred from all advertised tools; additive `baseScopes` would not exclude deletion. See the [OpenAI OAuth configuration reference](https://developers.openai.com/plugins/build/plugins#oauth-configuration-reference). Deletion requires separate, explicit `boards:delete` consent; an existing `boards:write` grant is insufficient. Organization permissions, account limits, and the user's consent still control account access. The installer never asks for, reads, or stores access tokens or guest capabilities. `doctor` checks local configuration and skill integrity; it does not prove that authentication, guest mode, or the live service works.

Try: “Use EasyGerber to create a board from the pin assignments in this firmware.” The agent reads relevant local code, selects published parts, and sends board requirements through the MCP service. Ordinary account scopes are `boards:read`, `boards:write`, `boards:generate`, and `boards:export`; organization permissions, quotas, and billing still apply.

## Create and continue without signing up

Public `search_parts` and `get_part` calls need no board or account. A board-scoped lookup uses its `boardRef` and preserves the board's strict Part List. For each new board, the agent generates a private reference once: `egbr1_` plus 32 cryptographically random bytes encoded as unpadded base64url. It sends that reference with the normal name, intent, and UUID `requestId` to `create_board`. The service saves an account-owned board when valid account access exists or establishes private access automatically. Subsequent board tools use the same reference, without coordinating a board UUID and a separate guest token.

A stateless client must retain this one reference in private tool context. After an uncertain creation result, it replays the exact original reference, request ID, and arguments; the service returns the original result without another board. Existing work must never be replaced because a reference was lost or rejected. Public UUIDs, request IDs, IP addresses, and client labels do not grant access. The reference is never a user-facing setup question and must not appear in source files, diagnostic logs, analytics, or public support requests. Account references still require the owning account's authorization.

Reads expose the current saved revision, layout freshness, and current generation. A client can read `get_generation` with the board reference alone when it does not have the job ID. It should not submit another generation as a status check or reuse a request ID with changed input. A completed job, current saved layout, and successful manufacturing check remain distinct facts.

Private access before signup supports a board's edits, layouts, checks, previews, manufacturing ZIPs, and editable `.egb` backups without lifetime operation caps or scheduled expiration. Normal request-rate, complexity, and compute protections still apply. The private viewer displays the saved schematic and PCB. Make changes and request exports through the agent; reload the viewer to see saved changes.

Keep the returned private viewer link to return to the board. New exports require current board access; an issued private download link returns its exact exported snapshot without automatic expiry, including after board edits, deletion, claim, or cleanup. Only explicit link revocation or deletion of the exported file ends that download access. The download page refreshes its internal storage authorization automatically. Anyone with a complete private link can use its granted access.

When you connect an account and ask to keep the board there, the agent calls `save_board_to_account` with the same reference and the service saves it into that personal account with authorized write access. Reading a board with `get_board` never moves it. The agent uses the returned account board before further edits. Finish an active layout first; generation polling and stopping do not themselves transfer the board. A busy response calls for waiting, not cancellation or replacement. The account copy preserves the saved layout without copying the old job history; a missing job after transfer is not a reason to regenerate a current layout. Browser sign-in and agent OAuth are separate: the private viewer can save a board after sign-in, but the agent connection still needs its own authorization for account work. Signing in solely for feedback or deletion does not authorize transferring another private board.

Older clients can continue using their existing `guestToken`, `guestCreationKey`, and explicit guest-start/claim calls at the compatibility boundary. These are not normal setup steps for new work. Existing credentials remain subject to their original revocation and ownership checks; an expired account connection never silently becomes anonymous.

## Delete an account board

Ask explicitly to delete a specified account board. The agent reads its current revision and calls `delete_board` only for that request. Deletion is permanent, has no restore operation, and cancels active jobs on the board. Creating, editing, or exporting a board does not authorize deletion or cleanup.

Deletion requires separate `boards:delete` OAuth consent and personal ownership or an organization owner/admin role. The installer and default client configurations do not request that scope; the client must support obtaining the additional approval. An existing `boards:write` grant cannot delete boards. A client registration limited to the earlier scopes must be deliberately updated or replaced through the client's normal reconnect or registration flow before requesting deletion consent. Existing registrations and grants do not gain deletion access automatically. Guest boards cannot be deleted through this tool, and the agent must not claim one merely to delete it. Signing in solely to delete an account board does not authorize claiming an unrelated guest board.

For the Codex installer's `easygerber` connection, which has no configured OAuth client ID, explicitly opt into deletion with these commands, verified with Codex CLI `0.163.0-alpha.10.2`:

```sh
codex mcp logout easygerber
codex mcp login easygerber \
  --scopes boards:read,boards:write,boards:generate,boards:export,boards:delete,offline_access \
  --oauth-client-registration dcr
```

Logout clears the locally cached client ID and tokens. Login creates a fresh dynamic client registration with the listed scopes and opens the browser for fresh consent, including deletion. These flags apply to this login; they do not change the installer-managed scopes in `config.toml`. Logout does not revoke the previous server-side client or grant. See the [Codex CLI scope selection and logout implementation](https://github.com/openai/codex/blob/4ebc485ca321243727539187169425fcf972f2c4/codex-rs/cli/src/mcp_cmd.rs#L584).

A connection with a configured OAuth client ID bypasses dynamic registration even with this flag. Its provider registration must allow `boards:delete` before the client can obtain fresh consent; the commands above are not a general fix for native plugins or other clients. See [Codex OAuth client registration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli#oauth-client-registration). After authorization, the agent still reads the specified account board again and deletes only on the user's explicit request.

Only a successful `{ boardId, deleted: true }` response confirms deletion. With the required OAuth scope, unavailable boards, insufficient ownership, and repeated requests for an absent board return `not_found`; this result does not prove that a deletion occurred. If the response is lost, the agent reports uncertainty rather than treating a later missing-board result as confirmation.

## Send feedback

Ask your agent to send EasyGerber a bug report, feature request, or general feedback. It uses `submit_feedback` only when you ask or agree, sending a concise message of 10–2000 characters after trimming to a private administrator inbox. It does not automatically send transcripts, raw diagnostics, board exports, credentials, or private links. A successful submission returns a receipt ID and timestamp; it does not promise a response or a roadmap commitment.

The general `/api/mcp` connection accepts anonymous feedback without signing in, starting a guest session, or creating a board. An already connected account or existing valid guest session can attribute the report. No additional board scope is required, and the default installer scopes remain unchanged. Invalid existing credentials remain denied rather than silently becoming anonymous. Signing in solely to send feedback does not authorize claiming a guest board. The account-only connection still requires sign-in during setup.

The agent keeps the same UUID `requestId` and identical report content and attribution when retrying an uncertain submission. If the tool, connection, or service is unavailable, use [GitHub Issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues). GitHub issues are public and require a GitHub account to post: review and redact your report before publishing, and never include credentials, private links, or confidential board data.

## ChatGPT and native Codex plugins

The OpenAI listing keeps the subtitle **AI PCB design and layout** within its 30-character limit. Other clients retain **AI PCB design, layout, and routing** from the generic package description. The manifest supplies five positive and three negative review cases; the third negative case has separate stages for unsupported actions and explicit deletion authorization checks. Run `node scripts/check-agent-openai-readiness.mjs` from the private checkout before uploading the generated portable ZIP. Private reviewer access and existing dashboard review materials must be checked in the secure portal, not bundled in the ZIP.

The portable root manifest and `mcp.json` support review for OpenAI's plugin directory. They declare mixed public and OAuth access: guests can discover tools without account authorization, and account operations use a registered public OAuth client with PKCE and normal consent. Its client ID is public metadata, not a credential. This does not alter the npm installer's automatic Codex registration. Guest discovery and optional account authorization need separate checks in each client; package validation does not establish directory approval or native-client acceptance. The native Codex package uses a separate compatible manifest and MCP file with automatic OAuth discovery; it does not copy the directory-only client ID. Use that native package in a supported desktop client, or the standalone installation above for Codex in the terminal and IDE. The portable directory ZIP is not interchangeable with the native ZIP. Avoid installing duplicate integrations in the same client.

For saved account boards in custom connectors that request account authorization only during setup, use `https://www.easygerber.com/api/mcp/account` and complete sign-in and consent when connecting. This account entry requires OAuth before initialization and uses the same tools, permissions, and board services. For guest-first access, use `https://www.easygerber.com/api/mcp`; account authorization is optional on that connection.

The two entries have distinct OAuth resources. Start a new connection when choosing the account entry; existing client registrations and tokens remain bound to their original resource. Do not copy tokens between entries. The published package manifests keep their existing connection URL.

## Claude

The Claude package is prepared in the `claude` folder of the public repository, with `.claude-plugin/plugin.json` and `.mcp.json`. It shares the EasyGerber skill, artwork, and hosted service with the OpenAI packages. The npm installer remains Codex-only. For local validation and loading with Claude Code 2.1.281 or newer, from a checkout of the public repository:

```sh
claude plugin validate ./claude --strict
claude --plugin-dir ./claude
```

Use `/mcp` in Claude Code to inspect the EasyGerber connection and authorize account access when needed. In Claude chat and Cowork, add or connect EasyGerber from the plugin’s Connectors tab. EasyGerber is approved and published in the Claude directory, with guest access through `/api/mcp`.

## Update and remove

Run `npx @easygerber/agent-plugin@0.3.10 setup`, then restart the Codex chat/IDE to load the board-reference workflow and current permission instructions. Upgrading from 0.2.x also replaces the retired `score_board` name with `check_board_layout`; no compatibility alias is provided.

The public source repository, npm, and client directories have separate publication steps. Check `npm view @easygerber/agent-plugin version` before requesting a specific npm version. If the source release is newer than npm, the npm command cannot install that release yet. From a checkout of the matching public release tag, run `npm install --ignore-scripts --no-package-lock`, then `node bin/easygerber.mjs setup` to use the same installer from that source. Restart the Codex chat/IDE afterward.

A server deployment updates instructions and tools returned by the next MCP initialization or discovery; it cannot replace an installed skill or text already loaded into a chat. Update the installed package or source checkout and start a new session to use the matching static guidance. For Gemini, run `gemini extensions update easygerber`. For folder-based clients, update the public checkout and reload or reinstall its selected plugin folder through the client's existing workflow. Directory-managed packages require an update from that directory; publishing this repository does not update every directory listing.

Run `setup` from the new package version to update unchanged managed files. Repeating the same setup is a no-op. A conflicting MCP entry or modified skill file causes setup to stop without replacing it. Keep the file, or move it aside yourself before retrying. Symlinked managed destinations are refused to avoid changing unexpected locations.

```sh
npx @easygerber/agent-plugin@0.3.10 uninstall --dry-run
npx @easygerber/agent-plugin@0.3.10 uninstall
```

Uninstall removes only unchanged files and the unchanged managed connection, preserving unrelated settings and modified files. It reports preserved paths and retains their ownership receipt. Revoke the account connection separately in Codex or EasyGerber; deleting local files does not revoke OAuth grants or invalidate an existing guest viewer link. Guest access ends after claim or revocation, not on an automatic timer. Cleanup can remove the retired guest copy; the claimed account copy and previously issued export links remain available. Interrupted setup can resume from its receipt. If a stale installer lock remains, verify no installer process is running before removing the lock path reported by the CLI.

## Network and data

The integration connects directly to `https://www.easygerber.com/api/mcp`, or `/api/mcp/account` for the native Cursor and Antigravity configurations and consumer Grok account connector; authorization uses the metadata and account flow advertised by the selected entry. Tool requests can contain the board requirements, component selections, schematic edits, board/organization identifiers, and feedback messages you approve for your task. Generated artifact links are returned by EasyGerber. The hosted service retains agent activity analytics for one year, including guest history after a board is claimed. The installer does not upload repositories, inspect environment files, run lifecycle hooks, or collect telemetry. Ordinary npm package retrieval is handled by npm.

See [integration documentation and support](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms).

## Maintainer validation and release

The public repository's default branch is `main`. The [square Grok marketplace logo](https://raw.githubusercontent.com/EasyGerber/easygerber-agent-plugin/main/assets/grok-marketplace.svg) is exported only to the repository, outside the npm and plugin packages. The archival `codex/grok-submission-assets` tag preserves the original artwork URL.

The repository's `server.json` declares release `0.1.1` of the [MCP Registry entry `io.github.EasyGerber/easygerber`](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.EasyGerber%2Feasygerber/versions/latest), using the general `https://www.easygerber.com/api/mcp` URL for guest discovery and optional account authorization. Directories that import Registry metadata should use that URL for guest-first access. Account-only client configurations remain available separately as described above. The manifest is exported only to the public repository; the npm and plugin packages contain no local MCP server or private engines. Registry version `0.1.1` tracks hosted-service metadata independently of npm and plugin version `0.3.10`.

The product's normal save and release scripts do not publish npm, the public integration repository, or MCP Registry. The private checkout's `npm run release:agent-plugin -- --output <directory>` prepares sanitized artifacts; `npm run check:agent-release -- --release-dir <directory>` verifies them. Publish only the generated `public-source` files to the existing public repository, preserving reviewed client configurations. Validate `public-source/server.json` with `mcp-publisher validate`, then publish it with `mcp-publisher publish` under the existing Registry identity and verify the latest metadata. Registry versions are immutable, so Registry metadata changes require a new Registry version independently of npm package releases.

For npm version 0.3.10, run `npm pack --ignore-scripts --pack-destination ..` from `<directory>/public-source`. From the private checkout, verify the resulting archive with `npm run check:agent-release -- --release-dir <directory> --npm-tarball <directory>/easygerber-agent-plugin-0.3.10.tgz`. Publish that exact verified archive with `npm publish <directory>/easygerber-agent-plugin-0.3.10.tgz --access public`.

The package contains the installer runtime, connection metadata, skills, and assets. The public repository also contains a GitHub Actions workflow and an installer smoke test. On pushes and pull requests, the workflow checks the packed installer on Linux, Windows, and macOS with Node.js 22 and 24. It tests temporary user profiles without connecting to EasyGerber or using account credentials. These checks cover installation behavior; they do not certify authentication or board operations in a particular agent client. See the [Actions results](https://github.com/EasyGerber/easygerber-agent-plugin/actions) for actual run status.

The production service supports guest creation, layout, previews, blocker checks, both exports, and account saving. Validate those operations and the sign-in continuation with the exact package and client being released; earlier service or package checks do not establish acceptance of a new client artifact.

The workflow and smoke test are excluded from the npm package and plugin ZIPs. The broader regression suite and release tooling remain in EasyGerber's private development checkout. That tooling creates the OpenAI ZIP, Claude ZIP, and public source from explicit file allowlists and verifies the resulting archive contents. The public source includes a generated `claude` folder: submit that plugin path in the existing repository. Claude requires the separate folder because the root npm installer has a `bin/` directory that Claude chat and Cowork cannot install. Shared skills and artwork are copied from their canonical sources during release; maintainers do not edit a second copy. The exported installer runtime uses only Node.js built-ins and the public `smol-toml` parser; it never imports EasyGerber's private packages. The Claude package contains only documentation, artwork, and remote connection metadata.

The same release also generates the root `.cursor-plugin/plugin.json` from shared metadata. Its inline MCP connection selects the account entry without changing the root OpenAI authentication settings. Cursor uses the existing root skill and assets; there is no separate copy to maintain. The Cursor manifest is included only in the public repository, outside the npm package and OpenAI/Claude ZIPs. Submit the public repository URL for Cursor review.

Antigravity uses the generated `.antigravity-plugin/plugin.json` and root `mcp_config.json` with the same root skill and artwork. These two files are included only in the public repository, outside the npm package and OpenAI/Claude ZIPs. The root OpenAI manifest and the other clients' configurations remain unchanged.

Kiro uses the generated eight-file `kiro` folder with standard Agent Plugins manifests and the guest-capable endpoint. Its skill includes the complete canonical workflow inline because relative workflow references did not resolve in the tested native session. The standalone reference remains unchanged. The Kiro folder is repository-only and adds no files to the npm package or OpenAI/Claude ZIPs; submit its public folder URL for Kiro review.

Gemini CLI uses the generated root `gemini-extension.json` and the same root skill. Its Streamable HTTP configuration uses `httpUrl` and leaves authorization optional for guest access. The release also generates `easygerber-gemini-extension-0.3.10.zip`, containing the manifest, shared skill and workflow reference, artwork, README, and license. The manifest and Gemini archive are outside the npm and other clients' packages. Publish that verified archive as the sole installable asset of the matching GitHub release; Gemini prefers the latest release when installing from the repository URL. Preserve historical releases, including the review video, and keep a valid extension archive on the latest release. No npm publication is needed for Gemini distribution.

Devin uses the generated root `.devin-plugin/plugin.json`, with the shared root skill and `assets/logo.svg`. Its inline MCP configuration selects the general guest-capable endpoint; native Devin manifests do not automatically read the portable root `mcp.json`. This repository-only metadata adds no files to the npm package or other clients' archives. Marketplace entries reference the existing public repository at a reviewed full commit SHA. Before submitting one, follow the marketplace's native installation and real tool-call requirement. Preserve the published Gemini release and its asset when publishing repository-only metadata.

Before publishing, confirm ownership of the npm scope, the official public integration repository, and the vendor publishing identities. Verify production sign-in and one complete create/revise/generate/export flow in supported clients. Inspect `npm pack --dry-run --json` from the public export. Publish only that sanitized package/repository; the product monorepo and its history stay private. Icons and listing copy in this package are editable release materials, not evidence of marketplace approval. Do not add npm install lifecycle hooks.

The MIT license covers this integration package, not the hosted service or private engines.
