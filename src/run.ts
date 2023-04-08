import arg from 'arg'
import * as assert from 'assert'
import * as cp from 'child_process'
import * as realFs from 'fs'
import * as glob from 'glob'
import {intersection} from 'lodash'
import * as path from 'path'
import type {Config} from './config'
import {aggressiveConfig, defaultConfig} from './config'

type Logger = Pick<Console, 'info'>

export const run = async ({
  fs = realFs,
  cwd = process.cwd(),
  argv = process.argv.slice(2),
  logger = console as Logger,
} = {}) => {
  const args = arg(
    {
      '--repo': String,
      '--ref': String,
      '--path': String,
      '--output': String,
      '--config': String,
      '--filter': String,
      '--purge': Boolean,
      '--aggressive': Boolean,
    },
    {argv},
  )

  const outputPath = path.resolve(cwd, args['--output'] || '.')

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
    return tempRepoDir
  }

  const getLocalDir = () => {
    const inputPath = args['--path']
    assert.ok(inputPath, '--path must be defined')
    return path.resolve(cwd, inputPath)
  }

  const copyFrom = args['--path'] ? getLocalDir() : getTempRepoDir()

  if (args['--ref']) {
    cp.execSync(`git fetch`, {cwd: copyFrom})
    cp.execSync(`git -c advice.detachedHead=false checkout ${args['--ref']}`, {cwd: copyFrom})
  }

  const config: Config = args['--config']
    ? require(args['--config']) // eslint-disable-line mmkal/@typescript-eslint/no-require-imports
    : args['--aggressive']
    ? aggressiveConfig
    : defaultConfig
  const handled = new Set()

  const globSync: typeof glob.sync = (pattern, options) => glob.sync(pattern, {dot: true, ...options})

  config.rules
    .slice()
    .reverse()
    .forEach(rule => {
      const files = globSync(rule.pattern, {cwd: copyFrom})
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
        if (newContent) {
          logger.info(`writing ${relPath} after matching pattern ${rule.pattern}`)
          fs.mkdirSync(path.dirname(absPath), {recursive: true})
          fs.writeFileSync(absPath, newContent)
        }

        handled.add(absPath)
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
