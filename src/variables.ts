import {AsyncLocalStorage} from 'async_hooks'

/** These variables can be overriden in configs to change the behaviour of the copy job. */
export const defaultVariables = {
  copyableDependencies: {} as Record<string, string>,
  copyableDevDeps: Object.fromEntries(
    [
      'jest',
      'ava',
      'mocha',
      'sinon',
      'playwright',
      'eslint',
      'prettier',
      'webpack',
      'rollup',
      'swc',
      'esbuild',
      'babel',
      'parcel',
      'typescript',
      'np',
      'tailwind',
      'ts-node',
      'tsup',
      'postcss',
      'autoprefixer',
      'react',
      'next',
    ].map(k => [k, k]),
  ),
}

export type Variables = typeof defaultVariables

export const variablesStorage = new AsyncLocalStorage<typeof defaultVariables>()
