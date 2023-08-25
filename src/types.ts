import type * as mergeStrategies from './merge'
import type {Variables} from './variables'

export interface Rule {
  pattern: string
  merge: mergeStrategies.MergeStrategy
}

export interface Config {
  variables: Variables
  rules: readonly Rule[]
}
