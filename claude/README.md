# EasyGerber for Claude

Describe a circuit or share your firmware pinout. Claude places catalog parts. EGT-2 Vela routes the copper. Ask to reroute an eligible EGT-1 board with its saved placements and check for disconnected pins. Download Gerber, drill, BOM, placement or editable board files. Guest boards need no account.

Try: “Create a small 3.3 V LED board, show a preview, and export manufacturing files.”

## Connection and data

The plugin connects to EasyGerber’s hosted MCP service at `https://www.easygerber.com/api/mcp`. It runs no local server, hooks, or package downloads. Claude sends only the board requirements, component selections, schematic changes, board identifiers, and feedback you approve. Account access uses OAuth with your consent.

See [documentation](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms). MIT licensed.
