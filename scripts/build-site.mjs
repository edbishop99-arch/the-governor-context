import { copyFileSync, existsSync, lstatSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PUBLIC_RUNTIME_FILES, verifyPublicBoundary } from './verify-public-boundary.mjs'

function argumentValue(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? fallback : process.argv[index + 1]
}

const currentFile = fileURLToPath(import.meta.url)
const defaultRoot = resolve(dirname(currentFile), '..')

try {
  const root = resolve(argumentValue('--root', defaultRoot))
  const output = resolve(argumentValue('--out', join(root, '_site')))
  const requiredOutput = join(root, '_site')
  if (output !== requiredOutput || relative(root, output).startsWith('..')) {
    throw new Error('The build output must be the _site directory directly inside the staged public repository')
  }
  if (existsSync(output) && lstatSync(output).isSymbolicLink()) {
    throw new Error('Refusing to replace a symbolic-link build directory')
  }

  verifyPublicBoundary(root)
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })

  for (const rel of PUBLIC_RUNTIME_FILES) {
    const destination = join(output, rel)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(join(root, rel), destination)
  }

  console.log(`Built GitHub Pages artifact with ${PUBLIC_RUNTIME_FILES.length} allowlisted files at ${output}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
