# EasyGerber for Claude

AI PCB design, layout, and routing. Describe a board in everyday language, or start from the pin assignments in your firmware. Choose published parts, edit the schematic, lay out and check the board, and download Gerber, drill, BOM, placement, and EasyGerber files. A first board needs no account.

Try: “Create a small 3.3 V LED board, show a preview, and export manufacturing files.”

## Connection and data

The plugin connects to EasyGerber’s hosted MCP service at `https://www.easygerber.com/api/mcp`. It runs no local server, hooks, or package downloads. Claude sends only the board requirements, component selections, schematic changes, board identifiers, and feedback you approve. Account access uses OAuth with your consent.

See [documentation](https://easygerber.com/agents), [privacy policy](https://easygerber.com/privacy), and [terms](https://easygerber.com/terms). MIT licensed.
