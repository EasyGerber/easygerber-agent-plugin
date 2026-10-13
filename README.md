# EasyGerber agent integration

This package connects coding agents to EasyGerber's hosted board-design tools. Its public files contain workflow instructions, connection metadata, icons, and a small installer. Board layout, routing, and scoring run on EasyGerber's servers.

Source is available in the [public integration repository](https://github.com/EasyGerber/easygerber-agent-plugin). The npm installer uses the commands below. The marketplace listing is not published yet.

## Codex in VS Code or the terminal

Requires Node.js 22 or newer, Codex, and an EasyGerber account:

```sh
npx @easygerber/agent-plugin@latest setup --dry-run
npx @easygerber/agent-plugin@latest setup
npx @easygerber/agent-plugin@latest doctor
```

Setup installs `~/.agents/skills/easygerber` and adds a small managed MCP table to `$CODEX_HOME/config.toml` (default `~/.codex/config.toml`). It preserves existing TOML text and other servers. An ownership receipt lives in `~/.easygerber/agent-plugin/codex-install.json`. No project files or firmware are changed. Codex is the default and only installer target; optional `--client codex` makes that choice explicit. All commands support unattended use, and `--yes` is accepted for scripts.

Restart the Codex chat/IDE after setup, then connect EasyGerber from MCP settings. If Codex CLI is installed, run:

```sh
codex mcp login easygerber
```

The client opens the account authorization flow and stores its credentials. The managed MCP configuration requests `boards:read`, `boards:write`, `boards:generate`, `boards:export`, and `offline_access`, so the initial consent covers board workflows and renewable access. Organization permissions, account limits, and the user's consent still control access. The installer never asks for, reads, or stores access tokens. `doctor` checks local configuration and skill integrity; it does not prove that authentication or the live service works.

Try: “Use EasyGerber to create a board from the pin assignments in this firmware.” The agent reads relevant local code, selects published parts, and sends board requirements through the MCP service. Account scopes are `boards:read`, `boards:write`, `boards:generate`, and `boards:export`; organization permissions, quotas, and billing still apply.

## ChatGPT and native Codex plugins

The portable root manifest and `mcp.json` are intended for OpenAI's shared plugin directory. After publication, install EasyGerber through that directory and connect your EasyGerber account. The Codex IDE extension currently uses the standalone installation above; it does not support plugins. Avoid installing the standalone integration and native plugin together, because that can duplicate skills and tools.

Only OpenAI/Codex is targeted for the initial release. Release artifacts contain the portable OpenAI plugin and Codex installer.

## Update and remove

Run `setup` from the new package version to update unchanged managed files. Repeating the same setup is a no-op. A conflicting MCP entry or modified skill file causes setup to stop without replacing it. Keep the file, or move it aside yourself before retrying. Symlinked managed destinations are refused to avoid changing unexpected locations.

```sh
npx @easygerber/agent-plugin@latest uninstall --dry-run
npx @easygerber/agent-plugin@latest uninstall
```

Uninstall removes only unchanged files and the unchanged managed connection, preserving unrelated settings and modified files. It reports preserved paths and retains their ownership receipt. Revoke the account connection separately in Codex or EasyGerber; deleting local files does not revoke OAuth grants. Interrupted setup can resume from its receipt. If a stale installer lock remains, verify no installer process is running before removing the lock path reported by the CLI.

## Network and data

The integration connects directly to `https://www.easygerber.com/api/mcp`; authorization uses the metadata and account flow advertised by that service. Tool requests can contain the board requirements, component selections, schematic edits, and board/organization identifiers needed for your task. Generated artifact links are returned by EasyGerber. The installer does not upload repositories, inspect environment files, run lifecycle hooks, or collect telemetry. Ordinary npm package retrieval is handled by npm.

See [integration documentation and support](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms).

## Maintainer validation and release

The package contains the installer runtime, connection metadata, skills, and assets. The public repository also contains a GitHub Actions workflow and an installer smoke test. On pushes and pull requests, the workflow checks the packed installer on Linux, Windows, and macOS with Node.js 22 and 24. It tests temporary user profiles without connecting to EasyGerber or using account credentials. These checks cover installation behavior; they do not certify authentication or board operations in a particular agent client. See the [Actions results](https://github.com/EasyGerber/easygerber-agent-plugin/actions) for actual run status.

The workflow and smoke test are excluded from the npm package and plugin ZIP. The broader regression suite and release tooling remain in EasyGerber's private development checkout. That tooling creates the OpenAI ZIP and public source from separate explicit file allowlists and verifies the resulting archive contents. The exported runtime uses only Node.js built-ins and the public `smol-toml` parser; it never imports EasyGerber's private packages.

Before publishing, confirm ownership of the npm scope, the official public integration repository, and the vendor publishing identities. Verify production sign-in and one complete create/revise/generate/export flow in supported clients. Inspect `npm pack --dry-run --json` from the public export. Publish only that sanitized package/repository; the product monorepo and its history stay private. Icons and listing copy in this package are editable release materials, not evidence of marketplace approval. Do not add npm install lifecycle hooks.

The MIT license covers this integration package, not the hosted service or private engines.
