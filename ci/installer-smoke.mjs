#!/usr/bin/env node

// Runs from the exported public repository using only Node.js and npm.
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
// Deliberately independent of package.json: CI, private files, and extra payloads
// must never enter the published tarball by changing its files declaration.
const NPM_FILES = [
  'LICENSE', 'README.md', 'assets/icon.svg', 'assets/logo.svg',
  'bin/easygerber.mjs', 'mcp.json', 'package.json', 'plugin.json',
  'skills/easygerber/SKILL.md', 'skills/easygerber/references/workflow.md',
  'src/cli.mjs', 'src/install.mjs',
].sort()

async function put(target, contents) {
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, contents)
}

async function tree(root) {
  const entries = {}
  async function visit(directory, prefix = '') {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${prefix}${entry.name}`
      const target = path.join(directory, entry.name)
      assert.ok(!entry.isSymbolicLink(), `Unexpected symbolic link: ${target}`)
      if (entry.isDirectory()) {
        entries[`${name}/`] = null
        await visit(target, `${name}/`)
      } else {
        assert.ok(entry.isFile(), `Expected a regular file: ${target}`)
        entries[name] = (await readFile(target)).toString('base64')
      }
    }
  }
  await visit(root)
  return entries
}

async function absent(target) {
  await assert.rejects(readFile(target), { code: 'ENOENT' })
}

async function findNpmCli() {
  const executableDirectory = path.dirname(process.execPath)
  const candidates = [
    process.env.npm_execpath,
    path.join(executableDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(executableDirectory, '../lib/node_modules/npm/bin/npm-cli.js'),
  ]
  for (const directory of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(directory, 'node_modules', 'npm', 'bin', 'npm-cli.js'))
    try { candidates.push(await realpath(path.join(directory, 'npm'))) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  for (const candidate of candidates) {
    if (!candidate || path.basename(candidate) !== 'npm-cli.js') continue
    try { return await realpath(candidate) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  throw new Error('Cannot locate npm-cli.js. Install Node.js with npm before running this check.')
}

const npmCli = await findNpmCli()
// realpath avoids system temporary-directory aliases (notably /var on macOS).
const temporaryBase = await realpath(process.env.EASYGERBER_SMOKE_TEMP || os.tmpdir())
const temporaryRoot = await mkdtemp(path.join(temporaryBase, 'easygerber installer smoke '))
try {
  const installRoot = path.join(temporaryRoot, 'npm install with spaces')
  const archiveRoot = path.join(temporaryRoot, 'packed archives')
  const npmUserConfig = path.join(temporaryRoot, 'empty user npmrc')
  const npmGlobalConfig = path.join(temporaryRoot, 'empty global npmrc')
  await mkdir(archiveRoot)
  await writeFile(npmUserConfig, '')
  await writeFile(npmGlobalConfig, '')
  await put(path.join(installRoot, 'package.json'), JSON.stringify({ private: true, name: 'installer-smoke-fixture', version: '1.0.0' }))

  async function npm(args, cwd) {
    // Execute npm's JS entry with Node instead of spawning a Windows .cmd file
    // or interpolating paths into a shell command. Lifecycle hooks stay disabled.
    const result = await execute(process.execPath, [
      npmCli, '--userconfig', npmUserConfig, '--globalconfig', npmGlobalConfig,
      '--cache', path.join(temporaryRoot, 'npm cache'), '--update-notifier=false', ...args,
    ], {
      cwd,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: {
        ...process.env,
        npm_config_ignore_scripts: 'true',
      },
    })
    return result.stdout
  }

  async function pack(source) {
    const output = await npm(['pack', '--json', '--ignore-scripts', '--workspaces=false', '--pack-destination', archiveRoot], source)
    const metadata = JSON.parse(output)
    const packages = Array.isArray(metadata) ? metadata : Object.values(metadata)
    assert.equal(packages.length, 1)
    assert.deepEqual(packages[0].files.map(file => file.path).sort(), NPM_FILES, 'npm tarball must contain exactly the public package files')
    const filename = packages[0].filename
    assert.equal(path.basename(filename), filename)
    const expected = new Map(await Promise.all(NPM_FILES.map(async name => [name, await readFile(path.join(source, name))])))
    return { tarball: path.join(archiveRoot, filename), expected }
  }

  const installedPackageRoot = path.join(installRoot, 'node_modules', '@easygerber', 'agent-plugin')
  async function install(packed) {
    await npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org', packed.tarball], installRoot)
    const installed = await tree(installedPackageRoot)
    assert.deepEqual(Object.keys(installed).filter(name => !name.endsWith('/')).sort(), NPM_FILES)
    for (const [name, expected] of packed.expected) {
      assert.deepEqual(await readFile(path.join(installedPackageRoot, name)), expected, `Installed payload differs: ${name}`)
    }
    // npm exec selects the installed executable/shim on each platform; --offline
    // prevents falling back to a registry download if the executable is missing.
    const help = await npm(['exec', '--offline', '--', 'easygerber', '--help'], installRoot)
    assert.match(help, /EasyGerber agent integration/)
    assert.match(help, /easygerber setup/)
    assert.match(help, /easygerber uninstall/)
  }

  await install(await pack(packageRoot))
  const { runCli } = await import(pathToFileURL(path.join(installedPackageRoot, 'src/cli.mjs')).href)
  const originalConfig = '# Preserve this comment and exact formatting.\nmodel = "installer-smoke"\n[mcp_servers.unrelated]\nurl = "https://example.invalid/mcp"'
  const unrelatedSkill = 'User-owned instructions for a different skill.\n'

  async function fixture(name) {
    const root = path.join(temporaryRoot, name)
    const context = { home: path.join(root, 'user profile with spaces'), codexHome: path.join(root, 'custom Codex settings with spaces') }
    const locations = {
      config: path.join(context.codexHome, 'config.toml'),
      skill: path.join(context.home, '.agents', 'skills', 'easygerber'),
      receipt: path.join(context.home, '.easygerber', 'agent-plugin', 'codex-install.json'),
      unrelated: path.join(context.home, '.agents', 'skills', 'unrelated', 'SKILL.md'),
    }
    await put(locations.config, originalConfig)
    await put(locations.unrelated, unrelatedSkill)
    await mkdir(path.dirname(locations.receipt), { recursive: true })
    return { root, context, locations }
  }

  async function cli(input, args, expectedStatus = 0) {
    const output = []
    const errors = []
    const status = await runCli(args, {
      context: input.context,
      output: line => output.push(line),
      errorOutput: line => errors.push(line),
    })
    assert.equal(status, expectedStatus, `${args.join(' ')}: ${[...output, ...errors].join('\n')}`)
    if (expectedStatus === 0) assert.deepEqual(errors, [])
    return [...output, ...errors].join('\n')
  }

  async function preserved(input) {
    assert.equal(await readFile(input.locations.unrelated, 'utf8'), unrelatedSkill)
    assert.ok((await readFile(input.locations.config, 'utf8')).startsWith(originalConfig))
    await absent(path.join(input.context.home, '.codex', 'config.toml'))
  }

  const lifecycle = await fixture('install and upgrade')
  const before = await tree(lifecycle.root)
  assert.match(await cli(lifecycle, ['doctor'], 1), /No standalone skill installation receipt/)
  assert.match(await cli(lifecycle, ['setup', '--client', 'codex', '--dry-run', '--yes']), /Would change 4 file\(s\)/)
  assert.deepEqual(await tree(lifecycle.root), before, 'setup dry-run must not write')
  assert.match(await cli(lifecycle, ['setup', '--yes']), /Changed 4 file\(s\)/)
  const installed = await tree(lifecycle.root)
  assert.match(await cli(lifecycle, ['setup', '--client', 'codex', '--yes']), /Changed 0 file\(s\)/)
  assert.match(await cli(lifecycle, ['doctor']), /Authentication is not checked/)
  assert.deepEqual(await tree(lifecycle.root), installed, 'repeated setup and doctor must not write')
  await preserved(lifecycle)

  // Build and install a real next-version tarball. The already loaded CLI reads
  // the newly installed package's manifest and skill files from the same path.
  const upgradeSource = path.join(temporaryRoot, 'upgrade package source')
  for (const name of NPM_FILES) {
    const destination = path.join(upgradeSource, name)
    await mkdir(path.dirname(destination), { recursive: true })
    await cp(path.join(installedPackageRoot, name), destination)
  }
  const manifest = JSON.parse(await readFile(path.join(upgradeSource, 'package.json'), 'utf8'))
  const version = /^(\d+)\.(\d+)\.(\d+)/.exec(manifest.version)
  assert.ok(version, 'Package version must be a semantic version')
  const nextVersion = `${version[1]}.${version[2]}.${Number(version[3]) + 1}-installer-smoke`
  await writeFile(path.join(upgradeSource, 'package.json'), JSON.stringify({ ...manifest, version: nextVersion }, null, 2) + '\n')
  const plugin = JSON.parse(await readFile(path.join(upgradeSource, 'plugin.json'), 'utf8'))
  await writeFile(path.join(upgradeSource, 'plugin.json'), JSON.stringify({ ...plugin, version: nextVersion }, null, 2) + '\n')
  const upgradedSkill = (await readFile(path.join(upgradeSource, 'skills/easygerber/SKILL.md'), 'utf8')) + '\n<!-- Installer smoke upgrade fixture. -->\n'
  await writeFile(path.join(upgradeSource, 'skills/easygerber/SKILL.md'), upgradedSkill)
  await install(await pack(upgradeSource))
  assert.match(await cli(lifecycle, ['setup', '--dry-run', '--yes']), /Would change 2 file\(s\)/)
  assert.deepEqual(await tree(lifecycle.root), installed, 'upgrade dry-run must not write')
  assert.match(await cli(lifecycle, ['setup', '--yes']), /Changed 2 file\(s\)/)
  assert.equal(await readFile(path.join(lifecycle.locations.skill, 'SKILL.md'), 'utf8'), upgradedSkill)
  assert.equal(JSON.parse(await readFile(lifecycle.locations.receipt, 'utf8')).version, nextVersion)
  const upgraded = await tree(lifecycle.root)
  assert.match(await cli(lifecycle, ['setup', '--yes']), /Changed 0 file\(s\)/)
  await cli(lifecycle, ['doctor', '--client', 'codex'])
  assert.deepEqual(await tree(lifecycle.root), upgraded)
  await preserved(lifecycle)

  assert.match(await cli(lifecycle, ['uninstall', '--dry-run', '--yes']), /Would change 4 file\(s\)/)
  assert.deepEqual(await tree(lifecycle.root), upgraded, 'uninstall dry-run must not write')
  assert.match(await cli(lifecycle, ['uninstall', '--yes']), /Changed 4 file\(s\)/)
  assert.deepEqual(await tree(lifecycle.root), before, 'uninstall must restore unrelated files exactly')
  assert.match(await cli(lifecycle, ['uninstall', '--client', 'codex', '--yes']), /Changed 0 file\(s\)/)
  await cli(lifecycle, ['doctor'], 1)
  assert.deepEqual(await tree(lifecycle.root), before)
  console.log('PASS: executable help, setup/upgrade/uninstall dry-runs, repeat operations, and doctor')

  for (const kind of ['connection', 'skill']) {
    const conflict = await fixture(`existing ${kind} conflict`)
    if (kind === 'connection') await writeFile(conflict.locations.config, originalConfig + '\n[mcp_servers.easygerber]\nurl = "https://example.invalid/existing"\n')
    else await put(path.join(conflict.locations.skill, 'SKILL.md'), 'User-owned EasyGerber instructions.\n')
    const snapshot = await tree(conflict.root)
    for (const args of [['setup', '--dry-run', '--yes'], ['setup', '--yes']]) {
      assert.match(await cli(conflict, args, 1), /existing or modified/)
      assert.deepEqual(await tree(conflict.root), snapshot, `${kind} conflict must be preserved`)
    }
    await absent(conflict.locations.receipt)
  }
  console.log('PASS: preexisting connection and skill conflicts are preserved')

  const edited = await fixture('modified owned files')
  await cli(edited, ['setup', '--yes'])
  const editedSkill = 'User edits must survive uninstall.\n'
  await writeFile(path.join(edited.locations.skill, 'SKILL.md'), editedSkill)
  await put(path.join(edited.locations.skill, 'personal-notes.md'), 'Untracked notes.\n')
  await mkdir(path.join(edited.locations.skill, 'personal empty directory'))
  const editedSnapshot = await tree(edited.root)
  assert.match(await cli(edited, ['setup', '--yes'], 1), /existing or modified/)
  await cli(edited, ['doctor'], 1)
  assert.match(await cli(edited, ['uninstall', '--dry-run', '--yes'], 1), /Preserved modified file/)
  assert.deepEqual(await tree(edited.root), editedSnapshot)
  assert.match(await cli(edited, ['uninstall', '--yes'], 1), /Preserved modified file/)
  assert.equal(await readFile(path.join(edited.locations.skill, 'SKILL.md'), 'utf8'), editedSkill)
  assert.equal(await readFile(path.join(edited.locations.skill, 'personal-notes.md'), 'utf8'), 'Untracked notes.\n')
  assert.deepEqual(await readdir(path.join(edited.locations.skill, 'personal empty directory')), [])
  assert.equal(await readFile(edited.locations.config, 'utf8'), originalConfig)
  await preserved(edited)
  const remaining = await tree(edited.root)
  assert.match(await cli(edited, ['uninstall', '--yes'], 1), /Changed 0 file\(s\)/)
  assert.deepEqual(await tree(edited.root), remaining)
  console.log('PASS: modified owned files and unrelated configuration/skills survive uninstall')
  console.log(`Installer smoke checks passed on ${process.platform}/${process.arch}, Node ${process.versions.node}; npm payload: ${NPM_FILES.length} files.`)
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}
