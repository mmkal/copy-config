import {jestFixture} from 'fs-syncer'
import {run} from '../src/run'

test('run', async () => {
  const syncer = jestFixture({targetState: {}})
  syncer.sync()
  const log = jest.fn()
  await run({
    cwd: syncer.baseDir,
    argv: ['--repo', 'mmkal/eslint-plugin-codegen', '--ref', 'v0.17.0'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchInlineSnapshot(`
    Object {
      ".eslintrc.cjs": "// eslint-disable-next-line mmkal/import/no-extraneous-dependencies
    const recommended = require('eslint-plugin-mmkal').getRecommended()

    module.exports = {
      ...recommended,
      overrides: [
        ...recommended.overrides,
        {
          files: ['*.md'],
          rules: {
            'mmkal/unicorn/filename-case': 'off',
            'mmkal/prettier/prettier': 'off',
          },
        },
      ],
      rules: {
        'mmkal/@typescript-eslint/no-explicit-any': 'off',
        'mmkal/@typescript-eslint/no-unsafe-assignment': 'off',
        'mmkal/@typescript-eslint/no-unsafe-return': 'off',
        'mmkal/@rushstack/hoist-jest-mock': 'off',
      },
    }

    // console.dir(module.exports, {depth: 100})
    ",
      ".github": Object {
        "workflows": Object {
          "ci.yml": "name: CI
    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]

    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - run: npm install --global pnpm@7
          - run: pnpm install
          - run: pnpm run build
          - run: pnpm run lint
          - run: pnpm test -- --coverage --coverageReporters=\\"json-summary\\"
          - uses: actions/github-script@v6
            id: coveragejson
            with:
              script: |
                const fs = require('fs')
                const summary = JSON.parse(fs.readFileSync('./coverage/coverage-summary.json').toString())
                const {pct} = summary.total.branches
                const colors = {'00EE00': 98, '9b9b5f': 95, 'FFFF33': 90}
                return {
                  pct,
                  color: Object.entries(colors).find(e => pct >= e[1])[0] || 'FF0000',
                }
          - name: coverage badge
            if: github.ref_name == 'main'
            uses: RubbaBoy/BYOB@v1.3.0
            with:
              NAME: coverage
              LABEL: coverage
              STATUS: '\${{ fromJson(steps.coveragejson.outputs.result).pct }}%'
              COLOR: \${{ fromJson(steps.coveragejson.outputs.result).color }}
              GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    ",
        },
      },
      ".gitignore": "node_modules
    dist
    *ignoreme*
    coverage

    # ignore non-pnpm lockfiles
    package-lock.json
    yarn.lock",
      ".prettierrc.js": "module.exports = require('eslint-plugin-mmkal/src/prettierrc')
    ",
      ".vscode": Object {
        "settings.json": "{
      \\"editor.codeActionsOnSave\\": {
        \\"source.fixAll.eslint\\": true
      },
      \\"eslint.validate\\": [
        \\"javascript\\",
        \\"typescript\\"
      ],
      \\"typescript.tsdk\\": \\"node_modules/typescript/lib\\"
    }",
      },
      "jest.config.js": "/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
    }
    ",
      "package.json": "{
      \\"name\\": \\"run\\",
      \\"version\\": \\"0.0.0\\",
      \\"scripts\\": {
        \\"eslint\\": \\"eslint --ext '.ts,.js,.md'\\",
        \\"lint\\": \\"tsc && eslint .\\",
        \\"build\\": \\"tsc -p tsconfig.lib.json\\",
        \\"test\\": \\"jest\\"
      },
      \\"files\\": [
        \\"dist\\",
        \\"*.md\\"
      ],
      \\"np\\": {
        \\"cleanup\\": false
      },
      \\"devDependencies\\": {
        \\"typescript\\": \\"4.8.2\\",
        \\"np\\": \\"7.6.2\\",
        \\"@types/jest\\": \\"29.0.0\\",
        \\"jest\\": \\"28.1.3\\",
        \\"ts-jest\\": \\"28.0.8\\",
        \\"@types/eslint\\": \\"7.2.6\\",
        \\"eslint\\": \\"8.23.0\\",
        \\"eslint-plugin-mmkal\\": \\"0.0.1-2\\"
      }
    }",
      "tsconfig.json": "{
      \\"compilerOptions\\": {
        \\"lib\\": [
          \\"es2017\\",
          \\"DOM\\"
        ],
        \\"target\\": \\"es2017\\",
        \\"module\\": \\"commonjs\\",
        \\"strict\\": true,
        \\"noEmit\\": true,
        \\"noErrorTruncation\\": true,
        \\"esModuleInterop\\": true
      },
      \\"include\\": [
        \\"src\\",
        \\"test\\",
        \\"*.js\\",
        \\".*.*js\\",
        \\"*.md\\"
      ]
    }",
      "tsconfig.lib.json": "{
      \\"extends\\": \\"./tsconfig.json\\",
      \\"compilerOptions\\": {
        \\"noEmit\\": false,
        \\"declaration\\": true,
        \\"outDir\\": \\"dist\\"
      },
      \\"include\\": [
        \\"src\\"
      ]
    }",
    }
  `)

  expect(log.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "writing ./package.json after matching pattern ./package.json",
      ],
      Array [
        "writing .github/workflows/ci.yml after matching pattern .github/**/*.{yml,yaml}",
      ],
      Array [
        "writing ./jest.config.js after matching pattern ./*.{js,cjs,ts}",
      ],
      Array [
        "writing ./.eslintrc.cjs after matching pattern ./.*.{js,cjs}",
      ],
      Array [
        "writing ./.prettierrc.js after matching pattern ./.*.{js,cjs}",
      ],
      Array [
        "writing .gitignore after matching pattern .gitignore",
      ],
      Array [
        "skipping /workspaces/copy-config/test/fixtures/run.test.ts/run/package.json for pattern {.,.vscode,.devcontainer}/*.json, already handled",
      ],
      Array [
        "writing ./tsconfig.json after matching pattern {.,.vscode,.devcontainer}/*.json",
      ],
      Array [
        "writing ./tsconfig.lib.json after matching pattern {.,.vscode,.devcontainer}/*.json",
      ],
      Array [
        "writing .vscode/settings.json after matching pattern {.,.vscode,.devcontainer}/*.json",
      ],
    ]
  `)
})
