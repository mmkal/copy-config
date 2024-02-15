import {execaSync} from '@rebundled/execa'
import * as jsYaml from 'js-yaml'
import * as lodash from 'lodash'
import * as os from 'os'
import * as path from 'path'
import type {PackageJson} from 'type-fest'
import {variablesStorage} from './variables'

type Meta = {
  filepath: string
  localCwd: string
  remoteCwd: string
}

export type MergeStrategy = (params: {remoteContent: string; localContent: string | undefined; meta: Meta}) => string

type Formatter = Pick<typeof JSON, 'parse' | 'stringify'>

const YAML: Formatter = {
  parse: str => jsYaml.load(str),
  stringify: obj => jsYaml.dump(obj),
}

const formatterMergeStrategy = <T = any>(
  formatter: Formatter,
  fn: (params: {remoteJson: T; localJson: T; meta: Meta}) => T,
): MergeStrategy & {jsonMergeStrategy: typeof fn} => {
  const mergeStrategy: MergeStrategy = ({remoteContent, localContent, meta}) => {
    const remoteJson = formatter.parse(remoteContent)
    const localJson = formatter.parse(localContent || '{}')
    const updated = fn({remoteJson, localJson, meta})
    return formatter.stringify(updated, null, 2) + os.EOL
  }

  return Object.assign(mergeStrategy, {jsonMergeStrategy: fn})
}

export const jsonRemoteDefaults = formatterMergeStrategy(JSON, ({remoteJson, localJson}) => {
  return lodash.defaultsDeep(localJson, remoteJson)
})

export const jsonAggressiveMerge = formatterMergeStrategy(JSON, ({remoteJson, localJson}) => {
  return lodash.merge({}, localJson, remoteJson)
})

export const yamlRemoteDefaults = formatterMergeStrategy(YAML, ({remoteJson, localJson}) => {
  return lodash.defaultsDeep(localJson, remoteJson)
})

export const yamlAggressiveMerge = formatterMergeStrategy(JSON, ({remoteJson, localJson}) => {
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
export const fairlySensiblePackageJson = formatterMergeStrategy<PackageJson>(JSON, ({remoteJson, localJson, meta}) => {
  const remoteDevDeps = remoteJson.devDependencies || {}

  // this is an (unavoidably?) confusing name. This is the name of the *git* remote for the local repo, nothing to do with the remote repo
  const localRepoGitRemote = execaSync('git', ['remote', '-v'], {cwd: meta.localCwd}).stdout.split(/\w+/g)[1]

  const variables = variablesStorage.getStore()!
  const devDepSubstrings = Object.values(variables.copyableDevDeps)
  const depSubstrings = Object.values(variables.copyableDependencies)

  const trimmedDownRemote = {
    name: path.parse(meta.localCwd).name,
    version: '0.0.0',
    main: remoteJson.main,
    exports: remoteJson.exports,
    module: remoteJson.module,
    bin: remoteJson.bin,
    type: remoteJson.types,
    files: remoteJson.files,
    author: remoteJson.author,
    np: remoteJson.np,
    scripts: lodash.pickBy(remoteJson.scripts, (_script, name) => /^[\w-]+$/.exec(name)),
    ...(localRepoGitRemote.startsWith('https://') && {
      homepage: localRepoGitRemote.startsWith('https://') ? `${localRepoGitRemote}#readme` : undefined,
      repository: {
        type: 'git',
        url: (localRepoGitRemote + '.git').replace(/\.git\.git$/, '.git'),
      },
    }),
    dependencies: lodash.pick(
      remoteJson.dependencies || {},
      Object.keys(remoteJson.dependencies || {}).filter(k =>
        depSubstrings.some(substring => substring && k.includes(substring)),
      ),
    ),
    devDependencies: lodash.pick(
      remoteDevDeps,
      Object.keys(remoteDevDeps).filter(k => devDepSubstrings.some(substring => substring && k.includes(substring))),
    ),
  } as PackageJson

  if (Object.keys(trimmedDownRemote.dependencies || {}).length === 0) {
    delete trimmedDownRemote.dependencies
  }

  if (Object.keys(trimmedDownRemote.devDependencies || {}).length === 0) {
    delete trimmedDownRemote.devDependencies
  }

  return lodash.defaultsDeep(localJson, trimmedDownRemote)
})

export const aggressivePackageJson = formatterMergeStrategy<PackageJson>(JSON, ({remoteJson, localJson, meta}) => {
  const {name, version, remotePkg} = fairlySensiblePackageJson.jsonMergeStrategy({
    remoteJson,
    localJson: {} as PackageJson, // initialize with empty
    meta,
  })

  return lodash.merge({name, version}, localJson, remotePkg)
})
