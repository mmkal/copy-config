import * as cp from 'child_process'
import * as lodash from 'lodash'
import * as os from 'os'
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
    return JSON.stringify(updated, null, 2) + os.EOL
  }

  return Object.assign(mergeStrategy, {jsonMergeStrategy: fn})
}

export const jsonRemoteDefaults = jsonMergeStrategy(({remoteJson, localJson}) => {
  return lodash.defaultsDeep(localJson, remoteJson)
})

export const jsonAggressiveMerge = jsonMergeStrategy(({remoteJson, localJson}) => {
  return lodash.merge({}, localJson, remoteJson)
})

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
export const fairlySensiblePackageJson = jsonMergeStrategy<PackageJson>(({remoteJson, localJson, meta}) => {
  const remoteDevDeps = remoteJson.devDependencies || {}

  // this is an (unavoidably?) confusing name. This is the name of the *git* remote for the local repo, nothing to do with the remote repo
  const localRepoGitRemote = cp.execSync('git remote -v', {cwd: meta.localCwd}).toString().split(/\w+/g)[1]

  const trimmedDownRemote = {
    name: path.parse(meta.localCwd).name,
    version: '0.0.0',
    scripts: lodash.pickBy(remoteJson.scripts, script => !script?.startsWith('_')),
    ...(localRepoGitRemote.startsWith('https://') && {
      homepage: localRepoGitRemote.startsWith('https://') ? `${localRepoGitRemote}#readme` : undefined,
      repository: {
        type: 'git',
        url: (localRepoGitRemote + '.git').replace(/\.git\.git$/, '.git'),
      },
    }),
    files: remoteJson.files,
    author: remoteJson.author,
    np: remoteJson.np,
    devDependencies: lodash.pick(remoteDevDeps, [
      'typescript',
      'np',
      ...Object.keys(remoteDevDeps).filter(k => k.includes('jest')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('ava')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('mocha')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('playwright')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('eslint')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('prettier')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('webpack')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('rollup')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('swc')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('esbuild')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('babel')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('parcel')),
      ...Object.keys(remoteDevDeps).filter(k => k.includes('ts-node')),
    ]),
  } as PackageJson

  return lodash.defaultsDeep(localJson, trimmedDownRemote)
})

export const aggressivePackageJson = jsonMergeStrategy<PackageJson>(({remoteJson, localJson, meta}) => {
  const {name, version, remotePkg} = fairlySensiblePackageJson.jsonMergeStrategy({
    remoteJson,
    localJson: {} as PackageJson, // initialize with empty
    meta,
  })

  return lodash.merge({name, version}, localJson, remotePkg)
})
