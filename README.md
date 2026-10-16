# EasyGerber agent integration

This package connects coding agents to EasyGerber's hosted board-design tools. Its public files contain workflow instructions, connection metadata, icons, and a small installer. Board layout, routing, and scoring run on EasyGerber's servers.

Version 0.3.3 clarifies how a new board starts when account status is unknown, so account-only connection checks do not prompt for sign-in before the guest workflow can begin. Existing guest sessions and authorized accounts are reused. Signing in still saves that task’s guest board to the personal account without another save confirmation. The tool contract and installer runtime are unchanged.

Source is available in the [public integration repository](https://github.com/EasyGerber/easygerber-agent-plugin). The npm installer and platform plugin packages have separate client-validation processes and share the EasyGerber workflow skill and hosted service.

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

## Codex in VS Code or the terminal

Requires Node.js 22 or newer and Codex. The published npm installer remains version 0.3.2; the 0.3.3 instruction package has not been published to npm. To install the published version:

```sh
npx @easygerber/agent-plugin@0.3.2 setup --dry-run
npx @easygerber/agent-plugin@0.3.2 setup
npx @easygerber/agent-plugin@0.3.2 doctor
```

Setup installs `~/.agents/skills/easygerber` and adds a small managed MCP table to `$CODEX_HOME/config.toml` (default `~/.codex/config.toml`). It preserves existing TOML text and other servers. An ownership receipt lives in `~/.easygerber/agent-plugin/codex-install.json`. No project files or firmware are changed. Codex is the default and only installer target; optional `--client codex` makes that choice explicit. All commands support unattended use, and `--yes` is accepted for scripts.

Restart the Codex chat/IDE after setup, then ask: “Create a small 3.3 V LED board, show a preview, and export the manufacturing files and EasyGerber file.” The agent uses your connected account or starts a guest board automatically through `https://www.easygerber.com/api/mcp`.

For your saved account boards or organization work, connect EasyGerber from MCP settings. If Codex CLI is installed, run:

```sh
codex mcp login easygerber
```

The client opens the account authorization flow and stores its credentials. The managed MCP configuration requests `boards:read`, `boards:write`, `boards:generate`, `boards:export`, and `offline_access`, so account consent covers board workflows and renewable access. Organization permissions, account limits, and the user's consent still control account access. The installer never asks for, reads, or stores access tokens or guest capabilities. `doctor` checks local configuration and skill integrity; it does not prove that authentication, guest mode, or the live service works.

Try: “Use EasyGerber to create a board from the pin assignments in this firmware.” The agent reads relevant local code, selects published parts, and sends board requirements through the MCP service. Account scopes are `boards:read`, `boards:write`, `boards:generate`, and `boards:export`; organization permissions, quotas, and billing still apply.

## Try before signing up

Guest access is live on EasyGerber's production MCP service and uses the published component catalog. The agent can create one board per session with unlimited edits, layouts, checks, previews, and manufacturing ZIP or `.egb` exports before signup. The board and session have no automatic expiry. Normal request-rate, board-complexity, and shared compute protections still apply. The service returns `limits: { boards: 1 }`; `expiresAt: null` means no scheduled expiration. The board limit applies to a session, not a verified person.

The agent keeps the guest capability in its tool context. Keep its private viewer link to return to the board; anyone with that link can access the guest design. Neither the raw token nor that link belongs in firmware repositories, public issues, or diagnostic logs. The viewer removes the token fragment and uses a private browser session. Guest access depends on keeping that capability or link; creating another session cannot recover a lost one. Download links expire after fifteen minutes, and export objects become eligible for cleanup twenty-four hours after creation. These artifact limits do not expire the guest board.

For account ownership, account-based recovery, and additional boards under your normal plan, sign in or create an account from the private viewer. The viewer saves the board to your personal account automatically after that sign-in handoff. Simply opening a guest preview in a browser that was already signed in leaves it as a guest board. In an agent task with a guest board, choosing sign-in or account work likewise includes saving that board without a separate **Keep board** confirmation: the agent uses `claim_guest_board` with the original guest token to start authorization and retries the claim after normal account consent. Generic native Settings **Authenticate** has no guest-board context, so the agent must resume the claim after that sign-in; the callback alone does not save the board.

A successful claim returns a new account board ID and ends guest access. The agent reads that account board before making further changes. If layout is still running, it waits and retries automatically without cancelling the job; if the claim fails or its response is lost, it retains the original token for a safe retry. Reuse the original guest session; do not create extra sessions to bypass the board limit or service protections. An expired account connection must be reauthorized; it does not silently become a guest connection.

## ChatGPT and native Codex plugins

The portable root manifest and `mcp.json` support review for OpenAI's plugin directory. They declare mixed public and OAuth access: guests can discover tools without account authorization, and account operations use a registered public OAuth client with PKCE and normal consent. Its client ID is public metadata, not a credential. This does not alter the npm installer's automatic Codex registration. Guest discovery and optional account authorization need separate checks in each client; package validation does not establish directory approval or native-client acceptance. The native Codex package uses a separate compatible manifest and MCP file with automatic OAuth discovery; it does not copy the directory-only client ID. Use that native package in a supported desktop client, or the standalone installation above for Codex in the terminal and IDE. The portable directory ZIP is not interchangeable with the native ZIP. Avoid installing duplicate integrations in the same client.

For custom connectors that request account authorization only during setup, use `https://www.easygerber.com/api/mcp/account` and complete sign-in and consent when connecting. This account entry requires OAuth before initialization and uses the same tools, permissions, and board services. The default `/api/mcp` entry continues to support guest use and optional account authorization.

The two entries have distinct OAuth resources. Start a new connection when choosing the account entry; existing client registrations and tokens remain bound to their original resource. Do not copy tokens between entries. The published package manifests keep their existing connection URL.

## Claude

The Claude package is prepared in the `claude` folder of the public repository, with `.claude-plugin/plugin.json` and `.mcp.json`. It shares the EasyGerber skill, artwork, and hosted service with the OpenAI packages. The npm installer remains Codex-only. For local validation and loading with Claude Code 2.1.281 or newer, from a checkout of the public repository:

```sh
claude plugin validate ./claude --strict
claude --plugin-dir ./claude
```

Use `/mcp` in Claude Code to inspect the EasyGerber connection and authorize account access when needed. In Claude chat and Cowork, add or connect EasyGerber from the plugin’s Connectors tab. These packages require their own client and directory validation; preparing the Claude package does not mean it is listed or approved.

## Update and remove

Run `npx @easygerber/agent-plugin@0.3.2 setup`, then restart the Codex chat/IDE to load the automatic-save instructions and current tools. Upgrading from 0.2.x also replaces the retired `score_board` name with `check_board_layout`; no compatibility alias is provided.

Run `setup` from the new package version to update unchanged managed files. Repeating the same setup is a no-op. A conflicting MCP entry or modified skill file causes setup to stop without replacing it. Keep the file, or move it aside yourself before retrying. Symlinked managed destinations are refused to avoid changing unexpected locations.

```sh
npx @easygerber/agent-plugin@0.3.2 uninstall --dry-run
npx @easygerber/agent-plugin@0.3.2 uninstall
```

Uninstall removes only unchanged files and the unchanged managed connection, preserving unrelated settings and modified files. It reports preserved paths and retains their ownership receipt. Revoke the account connection separately in Codex or EasyGerber; deleting local files does not revoke OAuth grants or invalidate an existing guest viewer link. Guest access ends after claim or revocation, not on an automatic timer. Retired guest data becomes eligible for cleanup twenty-four hours after claim or revocation; the claimed account copy stays available. Interrupted setup can resume from its receipt. If a stale installer lock remains, verify no installer process is running before removing the lock path reported by the CLI.

## Network and data

The integration connects directly to `https://www.easygerber.com/api/mcp`, or `/api/mcp/account` for the native Cursor and Antigravity configurations and consumer Grok account connector; authorization uses the metadata and account flow advertised by the selected entry. Tool requests can contain the board requirements, component selections, schematic edits, and board/organization identifiers needed for your task. Generated artifact links are returned by EasyGerber. The hosted service retains agent activity analytics for one year, including guest history after a board is claimed. The installer does not upload repositories, inspect environment files, run lifecycle hooks, or collect telemetry. Ordinary npm package retrieval is handled by npm.

See [integration documentation and support](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms).

## Maintainer validation and release

The package contains the installer runtime, connection metadata, skills, and assets. The public repository also contains a GitHub Actions workflow and an installer smoke test. On pushes and pull requests, the workflow checks the packed installer on Linux, Windows, and macOS with Node.js 22 and 24. It tests temporary user profiles without connecting to EasyGerber or using account credentials. These checks cover installation behavior; they do not certify authentication or board operations in a particular agent client. See the [Actions results](https://github.com/EasyGerber/easygerber-agent-plugin/actions) for actual run status.

The production service supports guest creation, layout, previews, blocker checks, both exports, and account saving. Validate those operations and the sign-in continuation with the exact package and client being released; earlier service or package checks do not establish acceptance of a new client artifact.

The workflow and smoke test are excluded from the npm package and plugin ZIPs. The broader regression suite and release tooling remain in EasyGerber's private development checkout. That tooling creates the OpenAI ZIP, Claude ZIP, and public source from explicit file allowlists and verifies the resulting archive contents. The public source includes a generated `claude` folder: submit that plugin path in the existing repository. Claude requires the separate folder because the root npm installer has a `bin/` directory that Claude chat and Cowork cannot install. Shared skills and artwork are copied from their canonical sources during release; maintainers do not edit a second copy. The exported installer runtime uses only Node.js built-ins and the public `smol-toml` parser; it never imports EasyGerber's private packages. The Claude package contains only documentation, artwork, and remote connection metadata.

The same release also generates the root `.cursor-plugin/plugin.json` from shared metadata. Its inline MCP connection selects the account entry without changing the root OpenAI authentication settings. Cursor uses the existing root skill and assets; there is no separate copy to maintain. The Cursor manifest is included only in the public repository, outside the npm package and OpenAI/Claude ZIPs. Submit the public repository URL for Cursor review.

Antigravity uses the generated `.antigravity-plugin/plugin.json` and root `mcp_config.json` with the same root skill and artwork. These two files are included only in the public repository, outside the npm package and OpenAI/Claude ZIPs. The root OpenAI manifest and the other clients' configurations remain unchanged.

Before publishing, confirm ownership of the npm scope, the official public integration repository, and the vendor publishing identities. Verify production sign-in and one complete create/revise/generate/export flow in supported clients. Inspect `npm pack --dry-run --json` from the public export. Publish only that sanitized package/repository; the product monorepo and its history stay private. Icons and listing copy in this package are editable release materials, not evidence of marketplace approval. Do not add npm install lifecycle hooks.

The MIT license covers this integration package, not the hosted service or private engines.
