# EasyGerber for Claude

![EasyGerber](assets/logo.svg)

AI PCB design, layout, and routing.

Design circuit boards with AI, from your first idea to the files your manufacturer needs. Describe what you want to build in everyday language, or start with the pin assignments in your firmware.

Choose from over one million electronic components in EasyGerber’s catalog, including LEDs, sensors, connectors, and microcontrollers. Build with real catalog parts, their footprints, and available 3D models—from a simple LED circuit to a custom electronics project.

Create and edit schematics, generate PCB layouts with automatic component placement and routing, and refine your design through conversation. Adjust board settings, explore copper layers, inspect your board in interactive 3D, and check for blocking layout issues before exporting.

Download Gerber files, drill files, a bill of materials (BOM), component placement files, and an editable EasyGerber file to continue working on your design.

Start with one guest board without signing up through `https://www.easygerber.com/api/mcp`. No account authorization is needed for guest access. When you sign in during the task, the agent saves the guest board to your account after consent. If you connect through client settings, resume the task so the agent can finish saving it; the sign-in callback alone does not transfer the board.

## Load the plugin

This is the Claude plugin folder in the [EasyGerber integration repository](https://github.com/EasyGerber/easygerber-agent-plugin). It contains the same EasyGerber workflow skill and artwork as the other integration packages. The npm installer configures Codex only; Claude uses this folder and its native plugin manifest.

For a local check with Claude Code 2.1.281 or newer, run these commands from the parent of this folder:

```sh
claude plugin validate ./claude --strict
claude --plugin-dir ./claude
```

In Claude Code, use `/mcp` to inspect the EasyGerber connection and authorize account access when needed. In Claude chat and Cowork, a remote MCP server appears on the plugin’s Connectors tab, where you add or connect it. EasyGerber is approved and published in the Claude directory with guest access.

Try: “Create a small 3.3 V LED board, show a preview, and export the manufacturing files and EasyGerber file.” Use an authorized account if connected; otherwise the service supports one guest board per session. The guest board has no automatic expiry, while generated download links expire after fifteen minutes. The private guest viewer link grants access to the design; keep it private. Signing in during that task includes saving its guest board to your personal account. The agent retains the original guest capability for the claim and continues with the returned account board.

## Connection and data

The plugin connects directly to EasyGerber’s hosted MCP service at `https://www.easygerber.com/api/mcp`. It runs no local server, installer, hooks, or package downloads. Board layout, routing, and scoring run on EasyGerber’s servers. Claude can read relevant firmware locally to identify pin assignments; it sends only the board requirements, published component selections, schematic changes, and board or organization identifiers needed for the requested work. It should not upload an entire repository or unrelated files.

The remote service supplies catalog results, saved board data, previews, and private export links. Account access uses the service’s advertised OAuth flow and your consent. Do not paste credentials into chat or add tokens to plugin files. Organization permissions, plan limits, and normal request and compute protections apply. The service retains agent activity analytics for one year, including guest history after claim. Removing the plugin does not revoke account authorization or invalidate a private guest link; manage account connections in Claude or EasyGerber.

Creating or exporting a board does not purchase fabrication, make the design public, or delete the source board. A successful layout check is not a safety certification. The MIT license covers this integration package; the hosted service and private engines have separate terms.

See [documentation and support](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms).
