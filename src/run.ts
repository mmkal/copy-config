import arg from 'arg'
import * as assert from 'assert'
import * as cp from 'child_process'
import * as realFs from 'fs'
import * as glob from 'glob'
import {intersection} from 'lodash'
import * as path from 'path'
import type {Config} from './config'
import {defaultConfig} from './config'

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
      '--config': String,
      '--ref': String,
      '--filter': String,
      '--purge': Boolean,
    },
    {argv},
  )

  let repo = args['--repo']
  assert.ok(repo, `--repo must be defined`)
  if (!repo.includes('://')) repo = `https://github.com/${repo}`
  assert.ok(!/\s/.test(repo), `Invalid repo: ${repo}`)

  const tmpParent = '/tmp/copy-config/' + repo.split('://')[1]
  fs.mkdirSync(tmpParent, {recursive: true})
  const tempDir = fs.mkdtempSync(tmpParent + '/')
  cp.execSync(`git clone ${repo}`, {cwd: tempDir})
  const tempRepoDir = path.join(tempDir, fs.readdirSync(tempDir)[0])

  if (args['--ref']) {
    cp.execSync(`git fetch`, {cwd: tempRepoDir})
    cp.execSync(`git -c advice.detachedHead=false checkout ${args['--ref']}`, {cwd: tempRepoDir})
  }

  // eslint-disable-next-line mmkal/@typescript-eslint/no-require-imports
  const config: Config = args['--config'] ? require(args['--config']) : defaultConfig

  const handled = new Set()

  config.rules
    .slice()
    .reverse()
    .forEach(rule => {
      const files = glob.sync(rule.pattern, {cwd: tempRepoDir})
      const filtered = args['--filter'] ? intersection(files, glob.sync(args['--filter'], {cwd: tempRepoDir})) : files
      filtered.forEach(relPath => {
        const absPath = path.join(cwd, relPath)
        if (handled.has(absPath)) {
          logger.info(`skipping ${absPath} for pattern ${rule.pattern}, already handled`)
          return
        }

        const remoteContent = fs.readFileSync(path.join(tempRepoDir, relPath)).toString()
        const localContent = fs.existsSync(absPath) ? fs.readFileSync(absPath).toString() : undefined
        const newContent = rule.merge({
          remoteContent,
          localContent,
          meta: {filepath: relPath, localCwd: cwd, remoteCwd: tempRepoDir},
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
    config.rules
      .slice()
      .reverse()
      .forEach(rule => {
        const localFiles = glob.sync(rule.pattern, {cwd})
        const filtered = args['--filter'] ? intersection(localFiles, glob.sync(args['--filter'], {cwd})) : localFiles
        filtered.forEach(relPath => {
          const remoteFile = path.join(tempRepoDir, relPath)
          const absPath = path.join(cwd, relPath)
          if (!fs.existsSync(remoteFile)) {
            logger.info(`Removing ${relPath} because it doesn't exist in ${repo}`)
            fs.unlinkSync(absPath)
          }
        })
      })
  }
}
