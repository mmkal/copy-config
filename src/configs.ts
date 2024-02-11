import * as assert from 'assert'
import * as mergeStrategies from './merge'
import type {Config} from './types'
import {defaultVariables} from './variables'

export const defaultConfig: Config = {
  variables: defaultVariables,
  rules: [
    {
      pattern: '{.,.vscode,.devcontainer,config}/*.json',
      ignore: ['package-lock.json'],
      merge: mergeStrategies.jsonRemoteDefaults,
    },
    {
      pattern: '{.,.vscode,.devcontainer,config}/*.{yml,yaml}',
      ignore: ['**/pnpm-lock.{yaml,yml}'],
      merge: mergeStrategies.yamlRemoteDefaults,
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
      pattern: './*.{js,cjs,ts,mjs}',
      merge: mergeStrategies.preferLocal,
    },
    {
      pattern: '.github/**/*.{yml,yaml}',
      merge: mergeStrategies.yamlRemoteDefaults,
    },
    {
      pattern: '.github/**/*.md',
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
  [mergeStrategies.yamlRemoteDefaults, mergeStrategies.yamlAggressiveMerge],
  [mergeStrategies.concat, mergeStrategies.replace],
  [mergeStrategies.preferLocal, mergeStrategies.replace],
  [mergeStrategies.fairlySensiblePackageJson, mergeStrategies.aggressivePackageJson],
]

export const makeAggressive = (input: Config): Config => ({
  variables: input.variables,
  rules: input.rules.map(rule => {
    const pairing = aggressiveEquivalents.find(p => p[0] === rule.merge)
    assert.ok(pairing, `There should be an aggressive equivalent for ${rule.pattern} merge strategy`)
    return {pattern: rule.pattern, merge: pairing[1]}
  }),
})

export const aggressiveConfig: Config = makeAggressive(defaultConfig)
