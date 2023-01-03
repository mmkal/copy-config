import arg from 'arg'
import * as assert from 'assert'
import * as cp from 'child_process'
import * as realFs from 'fs'
import * as glob from 'glob'
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
      files.forEach(relPath => {
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

  // todo: add `--purge` flag to search for config files on the local repo, and delete them if they don't exist on the remote?
  // todo: add way of checking git history so we don't override newer stuff with older
}
