---
name: easygerber
description: Create, inspect, revise, and export EasyGerber circuit boards using its remote MCP tools, including boards based on firmware pin assignments. Use when the user wants EasyGerber board work; ordinary firmware-only edits do not require this skill.
---

# EasyGerber board design

Use the installed EasyGerber MCP tools for the requested board workflow. Hosts may prefix tool names differently; discover the tools available on the EasyGerber connection and follow their current schemas. If the connection is missing, direct the user to https://easygerber.com/agents. For an expired connection, use the host's sign-in flow. Never ask for tokens in chat or read credentials from project files.

Read relevant firmware locally to extract pin assignments, signal names, power requirements, and connector needs. Send the minimum board requirements and schematic data needed for the request; do not upload the whole repository or unrelated files. Clarify electrical choices that cannot be inferred, such as an ambiguous power supply or conflicting pin assignments.

Use `get_profile` to identify the personal account and `list_organizations` when the user requests organization board work. New boards belong to the personal account by default; pass `organizationId` only for the organization the user requested. Existing board operations use the board's saved ownership. Authorization remains limited by the user's permissions in that organization.

Read [the workflow reference](references/workflow.md) for board creation, revision, generation, validation, and export. Search and inspect published catalog parts before connecting them. Preserve catalog IDs, pin identities, footprints, and available 3D models. Never invent component records or replace published footprints. Author the thin schematic and app-visible settings; the server hydrates catalog data and hidden routing/manufacturing constraints.

Inspect an existing board before editing it. Apply only the requested changes and use the revision/concurrency fields required by the live tool schema. On a conflict, reload the board and reconcile the user's change; do not overwrite a newer revision blindly. Board generation is asynchronous: retain its returned generation ID, inspect its status, and report results or actionable failures. Reuse an existing returned operation when a request outcome is uncertain instead of starting duplicate work.

Keep actions within the user's requested scope. Creating or revising a board does not authorize making it public or purchasing fabrication. Explain returned electrical or manufacturing issues accurately; successful generation or no blocking issues is not a safety certification. Return the board link and requested artifacts, and distinguish saved, generated, and exported states.
