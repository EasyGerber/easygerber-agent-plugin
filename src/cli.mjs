import { doctor, setup, uninstall } from './install.mjs'

const HELP = `EasyGerber agent integration

Usage:
  easygerber setup [--client codex] [--dry-run] [--yes]
  easygerber doctor [--client codex]
  easygerber uninstall [--client codex] [--dry-run] [--yes]

Installs a standalone skill and remote MCP connection for the current user.
Works with Codex CLI and IDE; no firmware or project files are changed.
--dry-run lists changes without writing files. --yes permits unattended use.
Codex is the default and only installer target in this release. Node.js 22+ is required.
Ask your agent to try one guest board when the service offers guest sessions.
Guest boards have no automatic expiry or lifetime edit/layout/export caps; service protections apply.
Account authorization is optional for the guest trial and completed in Codex's MCP sign-in flow.
`

export async function runCli(args, options = {}) {
  const output = options.output || (message => process.stdout.write(message + '\n'))
  const errorOutput = options.errorOutput || (message => process.stderr.write(message + '\n'))
  try {
    if (!args.length || args.includes('--help') || args[0] === 'help') { output(HELP); return 0 }
    const [command, ...flags] = args
    if (!['setup', 'doctor', 'uninstall'].includes(command)) throw new Error(`Unknown command: ${command}. Use --help.`)
    let client = 'codex'
    let dryRun = false
    const seen = new Set()
    for (let index = 0; index < flags.length; index++) {
      const flag = flags[index]
      if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`)
      seen.add(flag)
      if (flag === '--client') client = flags[++index]
      else if (flag === '--dry-run') dryRun = true
      else if (flag !== '--yes') throw new Error(`Unknown option: ${flag}`)
    }
    if (client !== 'codex') throw new Error('Only --client codex is supported. Other clients are not certified in this release.')
    if (command === 'doctor' && dryRun) throw new Error('doctor is already read-only; omit --dry-run.')
    const context = { ...options.context, dryRun }
    if (command === 'doctor') {
      const result = await doctor(context)
      output(result.ok ? 'EasyGerber skill and MCP configuration are installed.' : result.issues.join('\n'))
      output('Live service access is not checked. Guest support depends on the server and client; ask your agent to check the available EasyGerber tools.')
      output('For account boards, sign in through Codex MCP settings, or run: codex mcp login easygerber')
      output('If EasyGerber is also installed as a native plugin, keep one installation to avoid duplicate tools.')
      return result.ok ? 0 : 1
    }
    const result = await (command === 'setup' ? setup(context) : uninstall(context))
    output(`${dryRun ? 'Would change' : 'Changed'} ${result.changed.length} file(s).`)
    for (const target of result.changed) output(`  ${target}`)
    for (const target of result.preserved) output(`Preserved modified file: ${target}`)
    if (command === 'setup' && !dryRun) {
      output('Restart the Codex chat/IDE to load the skill, then ask EasyGerber to create, preview, and export a guest board without signing in.')
      output('Guest trials require server/client support. For account boards, use Codex MCP settings or run: codex mcp login easygerber')
      output('Do not install the native plugin alongside this standalone skill and connection.')
    }
    if (command === 'uninstall' && !dryRun) output('Local files were removed where unchanged. Disconnect/revoke EasyGerber authorization separately in Codex or your EasyGerber account.')
    return result.preserved.length ? 1 : 0
  } catch (error) {
    errorOutput(`EasyGerber: ${error.message}`)
    return 1
  }
}
