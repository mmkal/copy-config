import * as mergeStrategies from './merge'

export interface Rule {
  pattern: string
  merge: mergeStrategies.MergeStrategy
}

export interface Config {
  rules: readonly Rule[]
}

export const defaultConfig: Config = {
  rules: [
    {
      pattern: '{.,.vscode,.devcontainer}/*.json',
      merge: mergeStrategies.jsonRemoteDefaults,
    },
    {
      pattern: '*.codeworkspace',
      merge: mergeStrategies.jsonRemoteDefaults,
    },
    {
      pattern: '.{gitignore,prettierignore,eslintignore,npmignore}',
      merge: mergeStrategies.concat,
    },
    {
      pattern: './.*.{js,cjs}',
      merge: mergeStrategies.preferLocal,
    },
    {
      pattern: './*.{js,cjs,ts}',
      merge: mergeStrategies.preferLocal,
    },
    {
      pattern: '.github/**/*.{yml,yaml}',
      merge: mergeStrategies.preferLocal,
    },
    {
      pattern: './package.json',
      merge: mergeStrategies.fairlySensiblePackageJson,
    },
  ],
}
