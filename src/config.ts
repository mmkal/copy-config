import * as lodash from 'lodash'
import type {Config} from './types'

export const defaultConfig: Config = {
  rules: [
    {
      pattern: '{.,.vscode}/*.json',
      merge({remoteContent, localContent}) {
        const remote = JSON.parse(remoteContent)
        const local = JSON.parse(localContent || '{}')
        const updated = lodash.defaultsDeep(local, remote)
        return JSON.stringify(updated, null, 2)
      },
    },
    {
      pattern: '.gitignore',
      merge({remoteContent, localContent}) {
        const remoteLines = remoteContent.split('\n')
        const remoteLinesSet = new Set(remoteLines.map(line => line.trim()))
        const localLines = localContent?.split('\n') || ['']
        const combined = [
          // let local override remote
          ...remoteLines,
          ...localLines.filter(line => !remoteLinesSet.has(line.trim())),
        ]
        return combined.join('\n').trim()
      },
    },
    {
      pattern: './.*.{js,cjs}',
      merge: ({remoteContent, localContent}) => localContent || remoteContent,
    },
    {
      pattern: './*.{js,cjs,ts}',
      merge: ({remoteContent, localContent}) => localContent || remoteContent,
    },
    {
      pattern: '.github/**/*.{yml,yaml}',
      merge: ({remoteContent, localContent}) => localContent || remoteContent,
    },
    {
      pattern: './package.json',
      merge({remoteContent, localContent}) {
        /** @type {import('type-fest').PackageJson} */
        const remotePkg = JSON.parse(remoteContent)
        /** @type {import('type-fest').PackageJson} */
        const localPkg = JSON.parse(localContent || '{}')

        /** @type {import('type-fest').PackageJson} */
        const trimmedDownRemote = {
          scripts: remotePkg.scripts,
          devDependencies: lodash.pick(remotePkg.devDependencies, [
            'typescript',
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('jest')),
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('ava')),
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('mocha')),
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('playwright')),
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('eslint')),
            ...Object.keys(remotePkg.devDependencies).filter(k => k.includes('prettier')),
          ]),
        }

        const updatedLocal = lodash.defaultsDeep(localPkg, trimmedDownRemote)

        return JSON.stringify(updatedLocal, null, 2)
      },
    },
  ],
}
