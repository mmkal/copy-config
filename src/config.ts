import * as assert from 'assert'
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
      pattern: '.github/**/*.{yml,yaml,md}',
      merge: mergeStrategies.preferLocal,
    },
    {
      pattern: './package.json',
      merge: mergeStrategies.fairlySensiblePackageJson,
    },
  ],
}

const aggressiveEquivalents: Array<[mergeStrategies.MergeStrategy, mergeStrategies.MergeStrategy]> = [
  [mergeStrategies.jsonRemoteDefaults, mergeStrategies.jsonAggressiveMerge],
  [mergeStrategies.concat, mergeStrategies.replace],
  [mergeStrategies.preferLocal, mergeStrategies.replace],
  [mergeStrategies.fairlySensiblePackageJson, mergeStrategies.aggressivePackageJson],
]

export const aggressiveConfig: Config = {
  rules: defaultConfig.rules.map(rule => {
    const pairing = aggressiveEquivalents.find(p => p[0] === rule.merge)
    assert.ok(pairing, `There should be an aggressive equivalent for ${rule.pattern} merge strategy`)
    return {pattern: rule.pattern, merge: pairing[1]}
  }),
}
