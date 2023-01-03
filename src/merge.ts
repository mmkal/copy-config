import * as cp from 'child_process'
import * as lodash from 'lodash'
import * as path from 'path'
import type {PackageJson} from 'type-fest'

type Meta = {
  filepath: string
  localCwd: string
  remoteCwd: string
}

export type MergeStrategy = (params: {remoteContent: string; localContent: string | undefined; meta: Meta}) => string

const jsonMergeStrategy = <T = any>(
  fn: (params: {remoteJson: T; localJson: T; meta: Meta}) => T,
): MergeStrategy & {jsonMergeStrategy: typeof fn} => {
  const mergeStrategy: MergeStrategy = ({remoteContent, localContent, meta}) => {
    const remoteJson = JSON.parse(remoteContent)
    const localJson = JSON.parse(localContent || '{}')
    const updated = fn({remoteJson, localJson, meta})
    return JSON.stringify(updated, null, 2)
  }

  return Object.assign(mergeStrategy, {jsonMergeStrategy: fn})
}

export const jsonRemoteDefaults = jsonMergeStrategy(({remoteJson, localJson}) =>
  lodash.defaultsDeep(localJson, remoteJson),
)

export const jsonAggressiveMerge = jsonMergeStrategy(({remoteJson, localJson}) =>
  lodash.merge({}, remoteJson, localJson),
)

export const replace: MergeStrategy = ({remoteContent}) => remoteContent

export const concat: MergeStrategy = ({remoteContent, localContent}) => {
  const remoteLines = remoteContent.split('\n')
  const remoteLinesSet = new Set(remoteLines.map(line => line.trim()))
  const localLines = localContent?.split('\n') || ['']
  const combined = [
    // let local override remote
    ...remoteLines,
    ...localLines.filter(line => !remoteLinesSet.has(line.trim())),
  ]
  return combined.join('\n').trim()
}

export const preferLocal: MergeStrategy = ({remoteContent, localContent}) => localContent || remoteContent

/**
 * Combines a remote package.json with a local one:
 * - Inherits commonly-used devDependencies from the remote, if not already defined locally.
 * - Inherits scripts which don't use the convention of `_underscoreNaming` to mark themselves private.
 * - Defines a default project name of the local working directory
 * - Defines a default project version of 0.0.0
 */
export const fairlySensiblePackageJson: MergeStrategy = ({remoteContent, localContent, meta}) => {
  const remotePkg: PackageJson = JSON.parse(remoteContent) as PackageJson
  const localPkg: PackageJson = JSON.parse(localContent || '{}') as PackageJson

  const remoteDevDeps = remotePkg.devDependencies || {}

  const remote = cp.execSync('git remote -v', {cwd: meta.localCwd}).toString().split(/\w+/g)[1]

  const trimmedDownRemote = {
    name: path.parse(meta.localCwd).name,
    version: '0.0.0',
    scripts: lodash.pickBy(remotePkg.scripts, script => !script?.startsWith('_')),
    ...(remote.startsWith('https://') && {
      homepage: remote.startsWith('https://') ? `${remote}#readme` : undefined,
      repository: {
        type: 'git',
        url: (remote + '.git').replace(/\.git\.git$/, '.git'),
      },
    }),
    files: remotePkg.files,
    author: remotePkg.author,
    np: remotePkg.np,
    devDependencies: lodash.pick(remoteDevDeps, [
      'typescript',
      'np',
      ...Object.keys(remoteDevDeps).filter(k => k.includes('jest')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('ava')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('mocha')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('playwright')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('eslint')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('prettier')),
    ]),
  } as PackageJson

  const updatedLocal = lodash.defaultsDeep(localPkg, trimmedDownRemote)

  return JSON.stringify(updatedLocal, null, 2)
}
