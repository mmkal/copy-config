import type * as mergeStrategies from './merge'

export interface Rule {
  pattern: string
  merge: mergeStrategies.MergeStrategy
}

export interface Config {
  rules: readonly Rule[]
}
