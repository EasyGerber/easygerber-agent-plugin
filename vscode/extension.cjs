'use strict'

const vscode = require('vscode')

function activate(context) {
  context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider('easygerber', {
    provideMcpServerDefinitions() {
      return [new vscode.McpHttpServerDefinition('EasyGerber', vscode.Uri.parse('https://www.easygerber.com/api/mcp'), {}, context.extension.packageJSON.version)]
    },
  }))
}

module.exports = { activate }
