import { createHash, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, readFile, readdir, rename, rm, rmdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'smol-toml'

export const ENDPOINT = 'https://www.easygerber.com/api/mcp'
export const PACKAGE_NAME = '@easygerber/agent-plugin'
const SCOPES = ['boards:read', 'boards:write', 'boards:generate', 'boards:export', 'offline_access']
const DEFAULT_PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))
const BLOCK = `\n# BEGIN EasyGerber managed MCP connection\n[mcp_servers.easygerber]\nurl = "${ENDPOINT}"\nscopes = [${SCOPES.map(scope => JSON.stringify(scope)).join(', ')}]\n# END EasyGerber managed MCP connection\n`
const HASH = /^[a-f0-9]{64}$/
const digest = value => createHash('sha256').update(value).digest('hex')

export function installationPaths({ home = os.homedir(), codexHome = process.env.CODEX_HOME } = {}) {
  const resolvedHome = path.resolve(home)
  if (codexHome && !path.isAbsolute(codexHome)) throw new Error('CODEX_HOME must be an absolute path.')
  const stateRoot = path.join(resolvedHome, '.easygerber', 'agent-plugin')
  return {
    home: resolvedHome,
    config: path.join(codexHome || path.join(resolvedHome, '.codex'), 'config.toml'),
    skill: path.join(resolvedHome, '.agents', 'skills', 'easygerber'),
    receipt: path.join(stateRoot, 'codex-install.json'),
    lock: path.join(stateRoot, 'codex-install.lock'),
  }
}

// Check each existing ancestor without following symlinks in managed destinations.
async function safePath(target) {
  const resolved = path.resolve(target)
  const { root } = path.parse(resolved)
  let current = root
  for (const segment of resolved.slice(root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Refusing a symbolic-link destination: ${current}`)
    } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
  }
}

async function readOptional(target) {
  await safePath(target)
  try {
    const stat = await lstat(target)
    if (!stat.isFile()) throw new Error(`Expected a regular file: ${target}`)
    if (stat.size > 4 * 1024 * 1024) throw new Error(`File is too large to edit safely: ${target}`)
    return await readFile(target, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function configData(content, message = 'Codex config.toml is not valid TOML. Repair it before running setup; no configuration was replaced.') {
  try { return parse(content || '') } catch {
    throw new Error(message)
  }
}

function isExpectedConnection(value) {
  return value && typeof value === 'object' && Object.keys(value).length === 2 && value.url === ENDPOINT
    && Array.isArray(value.scopes) && value.scopes.length === SCOPES.length
    && value.scopes.every((scope, index) => scope === SCOPES[index])
}

function validateReceipt(value, locations) {
  if (!value || value.schema !== 1 || value.package !== PACKAGE_NAME || value.client !== 'codex'
    || value.configPath !== locations.config || value.skillPath !== locations.skill
    || !['installing', 'installed', 'uninstalling'].includes(value.state)
    || typeof value.version !== 'string' || !value.files || typeof value.files !== 'object' || Array.isArray(value.files)
    || ![null, BLOCK].includes(value.configBlock)) {
    throw new Error('Invalid or relocated EasyGerber ownership receipt. No files were changed.')
  }
  for (const [relative, hashes] of Object.entries(value.files)) {
    if (!/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(relative)
      || relative.split('/').some(segment => segment === '.' || segment === '..')
      || !Array.isArray(hashes) || hashes.length < 1 || hashes.length > 2 || hashes.some(hash => !HASH.test(hash))) {
      throw new Error('Invalid file ownership in EasyGerber receipt. No files were changed.')
    }
  }
  return value
}

async function loadReceipt(locations) {
  const content = await readOptional(locations.receipt)
  if (content === null) return { content, value: null }
  let value
  try { value = JSON.parse(content) } catch { throw new Error('EasyGerber ownership receipt is not valid JSON.') }
  return { content, value: validateReceipt(value, locations) }
}

async function skillFiles(packageRoot) {
  const files = {}
  async function visit(directory, prefix = '') {
    await safePath(directory)
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(target, `${relative}/`)
      else if (entry.isFile()) files[relative] = await readOptional(target)
      else throw new Error(`Unsupported file in packaged skill: ${relative}`)
    }
  }
  await visit(path.join(packageRoot, 'skills', 'easygerber'))
  if (!files['SKILL.md']) throw new Error('The package does not contain the EasyGerber skill.')
  return files
}

async function snapshot(locations, packageRoot) {
  const [config, receipt, files, manifest] = await Promise.all([
    readOptional(locations.config), loadReceipt(locations), skillFiles(packageRoot),
    readFile(path.join(packageRoot, 'package.json'), 'utf8').then(JSON.parse),
  ])
  const installed = {}
  for (const relative of new Set([...Object.keys(files), ...Object.keys(receipt.value?.files || {})])) {
    installed[relative] = await readOptional(path.join(locations.skill, relative))
  }
  return { config, receipt, files, installed, version: manifest.version }
}

async function writeAtomic(target, contents, expected) {
  if (await readOptional(target) !== expected) throw new Error(`File changed during installation; retry: ${target}`)
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
  await safePath(target)
  if (contents === null) { await rm(target, { force: true }); return }
  const temporary = `${target}.easygerber-${randomUUID()}.tmp`
  let handle
  try {
    const mode = expected === null ? 0o600 : (await lstat(target)).mode & 0o777
    handle = await open(temporary, 'wx', mode)
    await handle.writeFile(contents)
    await handle.sync()
    await handle.close()
    handle = null
    if (await readOptional(target) !== expected) throw new Error(`File changed during installation; retry: ${target}`)
    await rename(temporary, target)
  } finally {
    await handle?.close()
    await rm(temporary, { force: true })
  }
}

async function withLock(locations, callback) {
  await safePath(locations.lock)
  await mkdir(path.dirname(locations.lock), { recursive: true, mode: 0o700 })
  let handle
  try { handle = await open(locations.lock, 'wx', 0o600) } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another EasyGerber installation may be running. If it was interrupted, remove ${locations.lock} after verifying no installer is active, then retry.`)
    throw error
  }
  try {
    await handle.writeFile(`${process.pid}\n`)
    return await callback()
  } finally {
    await handle.close()
    await rm(locations.lock, { force: true })
  }
}

function installationPlan(state, locations) {
  const connection = configData(state.config).mcp_servers?.easygerber
  const ownedBlock = state.receipt.value?.configBlock
  const hasBlock = ownedBlock && state.config?.includes(ownedBlock)
  if (connection !== undefined && (!hasBlock || !isExpectedConnection(connection))) {
    throw new Error('An existing or modified EasyGerber MCP connection is present. Preserve it, or remove it manually before setup. No files were changed.')
  }
  if (!hasBlock && state.config?.includes('# BEGIN EasyGerber managed MCP connection')) {
    throw new Error('The EasyGerber MCP block was modified or has no ownership receipt. No files were changed.')
  }
  const writes = []
  const tracked = {}
  for (const [relative, installed] of Object.entries(state.installed)) {
    const previousHashes = state.receipt.value?.files[relative] || []
    if (installed !== null && !previousHashes.includes(digest(installed))) {
      throw new Error(`Preserving an existing or modified skill file: ${path.join(locations.skill, relative)}. Move it aside before setup.`)
    }
    const next = state.files[relative] ?? null
    if (next !== null) tracked[relative] = [...new Set([...(installed === null ? [] : [digest(installed)]), digest(next)])]
    else if (installed !== null) tracked[relative] = previousHashes
    if (next !== installed) writes.push({ path: path.join(locations.skill, relative), before: installed, after: next })
  }
  const nextConfig = hasBlock ? state.config : (state.config || '') + BLOCK
  configData(nextConfig, 'Codex config.toml is valid TOML, but its mcp_servers definition cannot be extended safely. Convert mcp_servers to TOML tables before setup. No files were changed.')
  if (nextConfig !== state.config) writes.push({ path: locations.config, before: state.config, after: nextConfig })
  const receipt = {
    schema: 1, package: PACKAGE_NAME, client: 'codex', version: state.version, state: 'installing',
    configPath: locations.config, skillPath: locations.skill, configBlock: BLOCK, files: tracked,
  }
  return { writes, receipt }
}

export async function setup(options = {}) {
  const locations = installationPaths(options)
  const packageRoot = options.packageRoot || DEFAULT_PACKAGE_ROOT
  const perform = async () => {
    const state = await snapshot(locations, packageRoot)
    const plan = installationPlan(state, locations)
    const finalReceipt = { ...plan.receipt, state: 'installed', files: Object.fromEntries(Object.entries(state.files).map(([name, contents]) => [name, [digest(contents)]])) }
    const finished = JSON.stringify(finalReceipt, null, 2) + '\n'
    const changed = plan.writes.map(write => write.path)
    if (state.receipt.content !== finished) changed.push(locations.receipt)
    if (options.dryRun || changed.length === 0) return { changed, preserved: [], locations, dryRun: !!options.dryRun }
    // Journal old/new hashes before changing files, so an interrupted update can resume.
    const journal = JSON.stringify(plan.receipt, null, 2) + '\n'
    await writeAtomic(locations.receipt, journal, state.receipt.content)
    for (const write of plan.writes) await writeAtomic(write.path, write.after, write.before)
    await writeAtomic(locations.receipt, finished, journal)
    return { changed, preserved: [], locations, dryRun: false }
  }
  return options.dryRun ? perform() : withLock(locations, perform)
}

async function removeEmptyDirectories(skillRoot, ownedFiles) {
  const directories = new Set([skillRoot])
  for (const relative of ownedFiles) {
    let directory = path.dirname(path.join(skillRoot, relative))
    while (directory.startsWith(skillRoot + path.sep)) {
      directories.add(directory)
      directory = path.dirname(directory)
    }
  }
  for (const directory of [...directories].sort((left, right) => right.length - left.length)) {
    await safePath(directory)
    try { await rmdir(directory) } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
    }
  }
}

export async function uninstall(options = {}) {
  const locations = installationPaths(options)
  const perform = async () => {
    const receipt = await loadReceipt(locations)
    if (!receipt.value) return { changed: [], preserved: [], locations, dryRun: !!options.dryRun }
    const writes = []
    const preserved = []
    const remaining = {}
    for (const [relative, hashes] of Object.entries(receipt.value.files)) {
      const target = path.join(locations.skill, relative)
      const contents = await readOptional(target)
      if (contents === null) continue
      if (hashes.includes(digest(contents))) writes.push({ path: target, before: contents, after: null })
      else { preserved.push(target); remaining[relative] = hashes }
    }
    let remainingBlock = receipt.value.configBlock
    if (remainingBlock) {
      const contents = await readOptional(locations.config)
      let connection
      try { connection = configData(contents).mcp_servers?.easygerber } catch { connection = false }
      if (contents?.includes(remainingBlock) && isExpectedConnection(connection)) {
        const withoutBlock = contents.replace(remainingBlock, '')
        configData(withoutBlock)
        writes.push({ path: locations.config, before: contents, after: withoutBlock || null })
        remainingBlock = null
      } else if (connection === undefined && !contents?.includes('# BEGIN EasyGerber managed MCP connection')) remainingBlock = null
      else preserved.push(locations.config)
    }
    const remainingReceipt = preserved.length ? JSON.stringify({ ...receipt.value, state: 'uninstalling', configBlock: remainingBlock, files: remaining }, null, 2) + '\n' : null
    const changed = writes.map(write => write.path)
    if (remainingReceipt !== receipt.content) changed.push(locations.receipt)
    if (!options.dryRun) {
      for (const write of writes) await writeAtomic(write.path, write.after, write.before)
      if (remainingReceipt !== receipt.content) await writeAtomic(locations.receipt, remainingReceipt, receipt.content)
      await removeEmptyDirectories(locations.skill, Object.keys(receipt.value.files))
    }
    return { changed, preserved, locations, dryRun: !!options.dryRun }
  }
  return options.dryRun ? perform() : withLock(locations, perform)
}

export async function doctor(options = {}) {
  const locations = installationPaths(options)
  const config = configData(await readOptional(locations.config))
  const receipt = await loadReceipt(locations)
  const issues = []
  if (!isExpectedConnection(config.mcp_servers?.easygerber)) issues.push('EasyGerber MCP connection is missing or differs from the installer configuration.')
  if (!receipt.value) issues.push('No standalone skill installation receipt found. A native plugin install may be managed by Codex instead.')
  else {
    if (receipt.value.state !== 'installed') issues.push('The previous installation did not complete. Run setup again, or inspect preserved files from uninstall.')
    for (const [relative, hashes] of Object.entries(receipt.value.files)) {
      const contents = await readOptional(path.join(locations.skill, relative))
      if (contents === null || !hashes.includes(digest(contents))) issues.push(`Skill file is missing or modified: ${relative}`)
    }
  }
  if (await readOptional(locations.lock) !== null) issues.push('An installer lock exists. Check whether another setup is active.')
  return { ok: issues.length === 0, issues, locations, authentication: 'not-checked', endpoint: ENDPOINT }
}
