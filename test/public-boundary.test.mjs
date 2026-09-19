import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const verifier = join(repoRoot, 'scripts', 'verify-public-boundary.mjs')
const builder = join(repoRoot, 'scripts', 'build-site.mjs')

function copyFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'governor-context-public-'))
  cpSync(repoRoot, fixtureRoot, {
    recursive: true,
    filter(source) {
      const rel = relative(repoRoot, source)
      const firstSegment = rel.split(/[\\/]/)[0]
      return !['.git', '_site', 'node_modules'].includes(firstSegment)
    },
  })
  return fixtureRoot
}

function runVerifier(root) {
  return spawnSync(process.execPath, [verifier, '--root', root], { encoding: 'utf8' })
}

function listFiles(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const rel = join(prefix, entry.name)
      return entry.isDirectory() ? listFiles(root, rel) : [rel]
    })
    .sort()
}

test('the staged public package satisfies the explicit release boundary', () => {
  const result = runVerifier(repoRoot)
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /Verified public boundary/)
})

test('the verifier rejects a manuscript or any other unlisted context artifact', () => {
  const fixtureRoot = copyFixture()
  try {
    writeFileSync(join(fixtureRoot, 'context', 'manuscript-working.json'), '{"private":true}\n')
    const result = runVerifier(fixtureRoot)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unexpected public repository file: context\/manuscript-working\.json/)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('the verifier rejects an unlisted file anywhere in the repository', () => {
  const fixtureRoot = copyFixture()
  try {
    writeFileSync(join(fixtureRoot, 'private-notes.txt'), 'must not ship\n')
    const result = runVerifier(fixtureRoot)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Unexpected public repository file: private-notes\.txt/)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('the verifier rejects a context artifact whose manifest hash no longer matches', () => {
  const fixtureRoot = copyFixture()
  try {
    const masterPath = join(fixtureRoot, 'context', 'governor-master-context-v1.2.1.md')
    writeFileSync(masterPath, `${readFileSync(masterPath, 'utf8')}tampered\n`)
    const result = runVerifier(fixtureRoot)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Hash mismatch for governor-master-context-v1\.2\.1\.md/)
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('the Pages build publishes only the approved runtime files', () => {
  const fixtureRoot = copyFixture()
  const outputRoot = join(fixtureRoot, '_site')
  try {
    execFileSync(process.execPath, [builder, '--root', fixtureRoot, '--out', outputRoot], { encoding: 'utf8' })
    assert.deepEqual(listFiles(outputRoot), [
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
    ])
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('reader URLs must be HTTPS and must not carry credentials or query data', async () => {
  const { normalizeReaderUrl } = await import(`${pathToFileURL(join(repoRoot, 'site.js')).href}?test=${Date.now()}`)
  assert.equal(normalizeReaderUrl('https://reader.example.com'), 'https://reader.example.com/')
  assert.equal(normalizeReaderUrl('http://reader.example.com'), null)
  assert.equal(normalizeReaderUrl('https://reader.example.com/?key=secret'), null)
  assert.equal(normalizeReaderUrl('https://user:pass@reader.example.com'), null)
  assert.equal(normalizeReaderUrl(''), null)
})

test('the optional landing-page counter uses only the configured reader origin', async () => {
  const { readerBeaconUrl } = await import(`${pathToFileURL(join(repoRoot, 'site.js')).href}?beacon-test=${Date.now()}`)
  assert.equal(
    readerBeaconUrl('https://reader.example.com/books/governor/'),
    'https://reader.example.com/__hit/github-pages.gif',
  )
  assert.equal(readerBeaconUrl(''), null)
  assert.equal(readerBeaconUrl('https://reader.example.com/?share=secret'), null)
})
