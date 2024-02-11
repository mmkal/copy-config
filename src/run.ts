import arg from 'arg'
import * as assert from 'assert'
import * as cp from 'child_process'
import * as realFs from 'fs'
import {globSync as _globSync} from 'glob'
import type {GlobOptionsWithFileTypesFalse} from 'glob/dist/cjs'
import {intersection} from 'lodash'
import * as path from 'path'
import {aggressiveConfig, defaultConfig} from './configs'
import type {Config} from './types'
import {variablesStorage} from './variables'

type Logger = Pick<Console, 'info'>

type MinimalFS = Pick<
  typeof realFs,
  'mkdirSync' | 'readFileSync' | 'writeFileSync' | 'unlinkSync' | 'mkdtempSync' | 'readdirSync' | 'existsSync'
>

export const run = async ({
  fs = realFs as MinimalFS,
  cwd = process.cwd(),
  argv = process.argv.slice(2),
  logger = console as Logger,
} = {}) => runWithArgs({fs, cwd, args: parseArgv(argv), logger})

const argSpec = {
  '--help': Boolean,
  '--repo': String,
  '--ref': String,
  '--path': String,
  '--output': String,
  '--config': String,
  '--filter': String,
  '--purge': Boolean,
  '--aggressive': Boolean,
  '--diff-check': String,
  '--dry-run': Boolean,
} satisfies arg.Spec

const parseArgv = (argv = process.argv.slice(2)) => {
  const {_, '--config': config, ...args} = arg(argSpec, {argv})

  return {
    ...args,
    config(source: string): Config {
      if (config) {
        // eslint-disable-next-line mmkal/@typescript-eslint/no-var-requires, mmkal/@typescript-eslint/no-require-imports
        const required = require(config.replace('%source%', source))
        return required.default || required.config || required
      }

      return args['--aggressive'] ? aggressiveConfig : defaultConfig
    },
  }
}

export const runWithArgs = async ({
  fs = realFs as MinimalFS,
  cwd = process.cwd(),
  args = parseArgv(process.argv.slice(2)),
  logger = console as Logger,
}) => {
  if (args['--help']) {
    // crappy markdown parser!
    const readme = realFs.readFileSync(path.join(__dirname, '../README.md')).toString()
    const optionDocs = readme.split('### ').flatMap(section => {
      if (!section.startsWith('`--')) return []
      const option = section.split('`')[1]
      const doc = section
        .slice(option.length + 2)
        .split('\n#')[0]
        .trim()
        .split('\n')
        .map(line => '  ' + line)
        .map(line => line.trim() && line)
        .join('\n')
      return [{option, doc}]
    })
    const options = Object.entries(argSpec).map(
      ([k, v]) => `${k} ${v.name.replace('Boolean', '')}\n${optionDocs.find(o => o.option === k)?.doc || ''}`,
    )
    logger.info(`Available options:\n\n${options.join('\n\n')}`)
    return
  }

  const outputPath = path.resolve(cwd, args['--output'] || '.')

  const diffCheckCommand = args['--diff-check'] ?? 'git diff --exit-code'

  const edits = [] as Array<{type: 'write' | 'delete'; filepath: unknown; content: unknown}>
  if (args['--dry-run']) {
    fs = {
      ...fs,
      mkdirSync: () => void 0,
      writeFileSync: (filepath, content) => void edits.push({type: 'write', filepath, content}),
      unlinkSync: filepath => void edits.push({type: 'delete', filepath, content: null}),
    }
  }

  try {
    if (diffCheckCommand && !args['--dry-run']) {
      cp.execSync(diffCheckCommand, {stdio: 'inherit'})
    }
  } catch (error: unknown) {
    const msg = `Diff check command "${diffCheckCommand}" failed. To resolve this you can stage your working changes before rerunning, or override the command, e.g. \`--diff-check ""\``
    throw Object.assign(new Error(msg), {cause: error})
  }

  const getTempRepoDir = () => {
    let repo = args['--repo']
    assert.ok(repo, `--repo must be defined`)
    if (!repo.includes('://')) repo = `https://github.com/${repo}`
    assert.ok(!/\s/.test(repo), `Invalid repo: ${repo}`)

    const tmpParent = '/tmp/copy-config/' + repo.split('://')[1]
    fs.mkdirSync(tmpParent, {recursive: true})
    const tempDir = fs.mkdtempSync(tmpParent + '/')
    cp.execSync(`git clone ${repo}`, {cwd: tempDir})
    const tempRepoDir = path.join(tempDir, fs.readdirSync(tempDir)[0])
    return path.join(tempRepoDir, args['--path'] || '.')
  }

  const getLocalDir = () => {
    const inputPath = args['--path']
    assert.ok(inputPath, '--path must be defined')
    return path.resolve(cwd, inputPath)
  }

  const copyFrom = args['--repo'] ? getTempRepoDir() : getLocalDir()

  if (args['--ref']) {
    cp.execSync(`git fetch`, {cwd: copyFrom})
    cp.execSync(`git -c advice.detachedHead=false checkout ${args['--ref']}`, {cwd: copyFrom})
  }

  const config: Config = args.config(copyFrom)
  const handled = new Set()

  const globSync = (pattern: string, options: GlobOptionsWithFileTypesFalse) =>
    _globSync(pattern, {dot: true, ...options})

  variablesStorage.run(config.variables, () => {
    const reversed = config.rules.slice().reverse()
    reversed.forEach(rule => {
      const files = globSync(rule.pattern, {cwd: copyFrom, ignore: rule.ignore})
      const filtered = args['--filter'] ? intersection(files, globSync(args['--filter'], {cwd: copyFrom})) : files
      filtered.forEach(relPath => {
        const absPath = path.join(outputPath, relPath)
        if (handled.has(absPath)) {
          logger.info(`skipping ${relPath} for pattern ${rule.pattern}, already handled`)
          return
        }

        const remoteContent = fs.readFileSync(path.join(copyFrom, relPath)).toString()
        const localContent = fs.existsSync(absPath) ? fs.readFileSync(absPath).toString() : undefined
        const newContent = rule.merge({
          remoteContent,
          localContent,
          meta: {filepath: relPath, localCwd: outputPath, remoteCwd: copyFrom},
        })
        if (newContent === localContent) {
          logger.info(`leaving ${relPath}, it's already up to date. Pattern ${rule.pattern}`)
        } else if (newContent) {
          logger.info(`writing ${relPath} after matching pattern ${rule.pattern}`)
          fs.mkdirSync(path.dirname(absPath), {recursive: true})
          fs.writeFileSync(absPath, newContent)
        }

        handled.add(absPath)
      })
    })
  })

  if (args['--purge']) {
    if (args['--path']) {
      throw new Error(`Can't purge if specifying local path`)
    }

    config.rules
      .slice()
      .reverse()
      .forEach(rule => {
        const localFiles = globSync(rule.pattern, {cwd: outputPath})
        const filtered = args['--filter']
          ? intersection(localFiles, globSync(args['--filter'], {cwd: outputPath}))
          : localFiles
        filtered.forEach(relPath => {
          const remoteFile = path.join(copyFrom, relPath)
          const absPath = path.join(outputPath, relPath)
          if (!fs.existsSync(remoteFile)) {
            logger.info(`Removing ${relPath} because it doesn't exist in ${args['--repo']}`)
            fs.unlinkSync(absPath)
          }
        })
      })
  }
}
