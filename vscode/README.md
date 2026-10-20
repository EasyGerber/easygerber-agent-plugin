# EasyGerber for Visual Studio Code

Design circuit boards through VS Code Chat using published components and EasyGerber's hosted service. This extension adds the EasyGerber MCP connection, the shared `/easygerber` skill, and a short getting-started walkthrough.

## Requirements and installation

- VS Code 1.109.3 or newer.
- VS Code Chat with an available model that supports tools. Model access and quotas are supplied by your model provider; this extension does not include a model subscription.
- An internet connection to `https://www.easygerber.com/api/mcp`.

Install **EasyGerber** by publisher **EasyGerber** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=easygerber.easygerber), or run:

```sh
code --install-extension easygerber.easygerber
```

You can also install a reviewed release VSIX with **Extensions: Install from VSIX...** or:

```sh
code --install-extension easygerber-vscode-extension-0.3.4.vsix
```

Open a new Chat session in Agent mode. Use `/easygerber` to load the PCB workflow, and keep normal tool approvals enabled. **MCP: List Servers** shows the extension's EasyGerber connection.

Use one EasyGerber connection at a time. If you already added EasyGerber through an MCP registry or a manual MCP configuration, disable that duplicate connection while using this extension. Installing this extension does not migrate or remove your existing settings.

## Start with a guest board

No EasyGerber account or API key is needed to start as a guest. For a small first design, ask:

> Use EasyGerber to make a passive signal-and-ground pass-through board with two published two-pin connectors. Confirm their catalog pins, use the app's supported defaults, generate the layout, show the preview, check for blocking issues, and export the manufacturing ZIP and editable EasyGerber file. Do not place an order.

The workflow uses real catalog parts, their footprints, and available 3D models. The agent should wait for layout generation to finish and check the current saved revision before exporting. A saved schematic alone is not a finished PCB.

A guest session supports one board and has no scheduled expiration. Its token, viewer link, and export links are private capabilities. Manufacturing and EasyGerber download links expire after fifteen minutes; that is separate from the lifetime of the guest board. Keep these links out of public issues and recordings.

## Continue with your EasyGerber account

Ask the agent to connect your existing EasyGerber account when you want to keep or continue working on a guest board. Complete the native OAuth consent flow, then resume the same task so the agent can finish saving the guest board to your account. GitHub/Copilot sign-in supplies model access and is separate from EasyGerber authorization.

The extension does not require account authorization during guest setup, embed credentials, or request extra OAuth permissions. Account tools use the hosted service's normal authorization. If authorization pauses the operation, return to Chat and ask the agent to resume the pending guest-board claim.

## Privacy, support, and scope

The extension registers a hosted MCP connection and provides workflow instructions. PCB placement, routing, and scoring run on EasyGerber's servers. Your selected model provider handles Chat prompts; authorized tool requests and board data go to EasyGerber. The extension adds no separate analytics or credential store.

Review the [privacy policy](https://easygerber.com/privacy) and [terms](https://easygerber.com/terms). See [EasyGerber integration documentation and support](https://easygerber.com/agents), or report connection problems through [GitHub Issues](https://github.com/EasyGerber/easygerber-agent-plugin/issues) without including private board links, tokens, or exports. Company contact: `hello@easygerber.com`.

The shared integration package is MIT licensed. Its license does not grant rights to the hosted service or proprietary PCB engines. The extension does not purchase boards, publish private designs, or delete boards as part of exporting them.
