import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_RELEASE = Object.freeze({
  protocol: 'GOVERNOR-MCT',
  packetVersion: '1.2.1',
  manifestSha256: '22be10267e8d49cb399df0bacc17b796b130322ce5be35c367422f552c6140cc',
  contextFiles: [
    'governor-master-context-v1.2.1.md',
    'governor-master-context-v1.2.1.json',
    'governor-compact-context-v1.2.1.md',
  ],
})

export const ALLOWED_REPOSITORY_FILES = Object.freeze([
  '.gitignore',
  '.nojekyll',
  'README.md',
  'config/release.json',
  'context/governor-compact-context-v1.2.1.md',
  'context/governor-master-context-v1.2.1.json',
  'context/governor-master-context-v1.2.1.md',
  'favicon.svg',
  'index.html',
  'package.json',
  'reader.json',
  'robots.txt',
  'scripts/build-site.mjs',
  'scripts/verify-public-boundary.mjs',
  'site.js',
  'styles.css',
  'test/public-boundary.test.mjs',
].sort())

export const PUBLIC_RUNTIME_FILES = Object.freeze([
  '.nojekyll',
  'context/governor-compact-context-v1.2.1.md',
  'context/governor-master-context-v1.2.1.json',
  'context/governor-master-context-v1.2.1.md',
  'favicon.svg',
  'index.html',
  'reader.json',
  'robots.txt',
  'site.js',
  'styles.css',
].sort())

const IGNORED_PREFIXES = ['.git/', '_site/', 'node_modules/']

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function walkFiles(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    const rel = relative(root, absolutePath).replaceAll('\\', '/')
    if (IGNORED_PREFIXES.some((prefix) => `${rel}/`.startsWith(prefix))) return []
    if (entry.isSymbolicLink() || lstatSync(absolutePath).isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in the public package: ${rel}`)
    }
    return entry.isDirectory() ? walkFiles(root, absolutePath) : [rel]
  })
}

function assertExactList(actual, expected, label) {
  const actualSorted = [...actual].sort()
  const expectedSorted = [...expected].sort()
  const unexpected = actualSorted.find((item) => !expectedSorted.includes(item))
  if (unexpected) throw new Error(`Unexpected ${label}: ${unexpected}`)
  const missing = expectedSorted.find((item) => !actualSorted.includes(item))
  if (missing) throw new Error(`Missing required ${label}: ${missing}`)
}

function inspectForSecrets(root, files) {
  const patterns = [
    {
      label: 'private key block',
      regex: new RegExp(['-----BEGIN', 'PRIVATE KEY-----'].join(' ')),
    },
    {
      label: 'GitHub access token',
      regex: new RegExp(`\\b${['github', '_pat_'].join('')}[A-Za-z0-9_]{20,}\\b|\\b${['gh', 'p_'].join('')}[A-Za-z0-9]{30,}\\b`),
    },
    {
      label: 'OpenAI API key',
      regex: new RegExp(`\\b${['s', 'k-'].join('')}[A-Za-z0-9_-]{20,}\\b`),
    },
    {
      label: 'Cloudflare tunnel token assignment',
      regex: new RegExp(`${['TUNNEL', '_TOKEN'].join('')}\\s*[:=]\\s*["']?[A-Za-z0-9._-]{20,}`, 'i'),
    },
  ]

  for (const rel of files) {
    const bytes = readFileSync(join(root, rel))
    if (bytes.includes(0)) continue
    const text = bytes.toString('utf8')
    for (const { label, regex } of patterns) {
      if (regex.test(text)) throw new Error(`Possible ${label} in ${rel}`)
    }
  }
}

function validateReaderConfig(root) {
  const config = JSON.parse(readFileSync(join(root, 'reader.json'), 'utf8'))
  if (typeof config.countLandingVisits !== 'boolean') {
    throw new Error('countLandingVisits must be true or false')
  }
  if (config.readerUrl === '') return
  if (typeof config.readerUrl !== 'string') throw new Error('readerUrl must be an HTTPS URL or an empty string')

  let url
  try {
    url = new URL(config.readerUrl)
  } catch {
    throw new Error('readerUrl must be an HTTPS URL or an empty string')
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('readerUrl must use HTTPS and contain no credentials, query string, or fragment')
  }
}

export function verifyPublicBoundary(rootInput) {
  const root = resolve(rootInput)
  const files = walkFiles(root).sort()
  assertExactList(files, ALLOWED_REPOSITORY_FILES, 'public repository file')

  const release = JSON.parse(readFileSync(join(root, 'config', 'release.json'), 'utf8'))
  if (release.protocol !== EXPECTED_RELEASE.protocol || release.packetVersion !== EXPECTED_RELEASE.packetVersion) {
    throw new Error('Release protocol or packet version is not the approved 1.2.1 boundary')
  }
  if (release.manifestSha256 !== EXPECTED_RELEASE.manifestSha256) {
    throw new Error('Release configuration does not contain the approved manifest hash')
  }
  assertExactList(release.contextFiles, EXPECTED_RELEASE.contextFiles, 'context allowlist entry')

  const contextRoot = join(root, 'context')
  const contextFiles = readdirSync(contextRoot, { withFileTypes: true }).map((entry) => {
    if (!entry.isFile()) throw new Error(`Unexpected context directory entry: ${entry.name}`)
    return entry.name
  })
  assertExactList(contextFiles, EXPECTED_RELEASE.contextFiles, 'context artifact')

  const manifestPath = join(contextRoot, 'governor-master-context-v1.2.1.json')
  const manifestBytes = readFileSync(manifestPath)
  const manifestHash = sha256(manifestBytes)
  if (manifestHash !== EXPECTED_RELEASE.manifestSha256) {
    throw new Error(`Hash mismatch for governor-master-context-v1.2.1.json: ${manifestHash}`)
  }

  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  if (manifest.protocol !== EXPECTED_RELEASE.protocol || manifest.packetVersion !== EXPECTED_RELEASE.packetVersion) {
    throw new Error('Manifest protocol or packet version is not 1.2.1')
  }

  const declaredArtifacts = [manifest.artifacts?.masterKernel, manifest.artifacts?.compactKernel]
  for (const artifact of declaredArtifacts) {
    if (!artifact || !EXPECTED_RELEASE.contextFiles.includes(artifact.filename)) {
      throw new Error('Manifest does not declare the approved master and compact context artifacts')
    }
    const bytes = readFileSync(join(contextRoot, artifact.filename))
    const actualHash = sha256(bytes)
    if (actualHash !== artifact.rawSha256) {
      throw new Error(`Hash mismatch for ${artifact.filename}: expected ${artifact.rawSha256}, received ${actualHash}`)
    }
    if (bytes.byteLength !== artifact.bytes) {
      throw new Error(`Byte-count mismatch for ${artifact.filename}: expected ${artifact.bytes}, received ${bytes.byteLength}`)
    }
  }

  const html = readFileSync(join(root, 'index.html'), 'utf8')
  if (!/name="robots" content="[^"]*noindex[^"]*nofollow/.test(html)) {
    throw new Error('index.html must remain noindex and nofollow until publication policy changes explicitly')
  }
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8')
  if (!/^User-agent: \*\nDisallow: \/\n?$/.test(robots)) {
    throw new Error('robots.txt must disallow crawling until publication policy changes explicitly')
  }

  validateReaderConfig(root)
  inspectForSecrets(root, files)

  return {
    files: files.length,
    contextArtifacts: contextFiles.length,
    packetVersion: manifest.packetVersion,
    manifestHash,
  }
}

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? fallback : process.argv[index + 1]
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  try {
    const rootArg = argumentValue('--root', resolve(currentFile, '..', '..'))
    if (!rootArg || (!isAbsolute(rootArg) && rootArg.trim() === '')) throw new Error('Missing --root value')
    const result = verifyPublicBoundary(rootArg)
    console.log(`Verified public boundary: ${result.contextArtifacts} context artifacts, ${result.files} repository files, GOVERNOR-MCT/${result.packetVersion}.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
