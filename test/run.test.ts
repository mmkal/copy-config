import {jestFixture} from 'fs-syncer'
import {defaultConfig} from '../src'
import {run, runWithArgs} from '../src/run'

const testArgs = {
  '--repo': 'mmkal/eslint-plugin-codegen',
  '--ref': 'v0.17.0',
  '--diff-check': '',
}
const testArgv = Object.entries(testArgs).flat()

test('run', async () => {
  const syncer = jestFixture({targetState: {}})
  syncer.sync()
  const log = jest.fn()
  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchInlineSnapshot(`
    {
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
      ".github": {
        "workflows": {
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
          - run: pnpm test -- --coverage --coverageReporters="json-summary"
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
      ".vscode": {
        "settings.json": "{
      "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
      },
      "eslint.validate": [
        "javascript",
        "typescript"
      ],
      "typescript.tsdk": "node_modules/typescript/lib"
    }
    ",
      },
      "jest.config.js": "/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
    }
    ",
      "package.json": "{
      "name": "run",
      "version": "0.0.0",
      "main": "dist/index.js",
      "type": "dist/index.d.ts",
      "files": [
        "dist",
        "*.md"
      ],
      "np": {
        "cleanup": false
      },
      "scripts": {
        "eslint": "eslint --ext '.ts,.js,.md'",
        "lint": "tsc && eslint .",
        "build": "tsc -p tsconfig.lib.json",
        "test": "jest"
      },
      "devDependencies": {
        "@babel/types": "7.12.11",
        "@types/babel__generator": "7.6.2",
        "@types/babel__traverse": "7.11.0",
        "@types/eslint": "7.2.6",
        "@types/jest": "29.0.0",
        "eslint": "8.23.0",
        "eslint-plugin-mmkal": "0.0.1-2",
        "jest": "28.1.3",
        "np": "7.6.2",
        "ts-jest": "28.0.8",
        "ts-node": "9.1.1",
        "typescript": "4.8.2"
      }
    }
    ",
      "tsconfig.json": "{
      "compilerOptions": {
        "lib": [
          "es2017",
          "DOM"
        ],
        "target": "es2017",
        "module": "commonjs",
        "strict": true,
        "noEmit": true,
        "noErrorTruncation": true,
        "esModuleInterop": true
      },
      "include": [
        "src",
        "test",
        "*.js",
        ".*.*js",
        "*.md"
      ]
    }
    ",
      "tsconfig.lib.json": "{
      "extends": "./tsconfig.json",
      "compilerOptions": {
        "noEmit": false,
        "declaration": true,
        "outDir": "dist"
      },
      "include": [
        "src"
      ]
    }
    ",
    }
  `)

  expect(log.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "writing package.json after matching pattern ./package.json",
      ],
      [
        "writing .github/workflows/ci.yml after matching pattern .github/**/*.{yml,yaml,md}",
      ],
      [
        "writing jest.config.js after matching pattern ./*.{js,cjs,ts,mjs}",
      ],
      [
        "writing .prettierrc.js after matching pattern ./*.{js,cjs,ts,mjs}",
      ],
      [
        "writing .eslintrc.cjs after matching pattern ./*.{js,cjs,ts,mjs}",
      ],
      [
        "skipping .prettierrc.js for pattern ./.*.{js,cjs}, already handled",
      ],
      [
        "skipping .eslintrc.cjs for pattern ./.*.{js,cjs}, already handled",
      ],
      [
        "writing .gitignore after matching pattern .{gitignore,prettierignore,eslintignore,npmignore}",
      ],
      [
        "writing tsconfig.lib.json after matching pattern {.,.vscode,.devcontainer,config}/*.json",
      ],
      [
        "writing tsconfig.json after matching pattern {.,.vscode,.devcontainer,config}/*.json",
      ],
      [
        "skipping package.json for pattern {.,.vscode,.devcontainer,config}/*.json, already handled",
      ],
      [
        "writing .vscode/settings.json after matching pattern {.,.vscode,.devcontainer,config}/*.json",
      ],
    ]
  `)
})

test('set variables', async () => {
  const syncer = jestFixture({targetState: {}})
  syncer.sync()
  const log = jest.fn()
  await runWithArgs({
    cwd: syncer.baseDir,
    args: {
      ...testArgs,
      '--filter': './package.json',
      config: () => ({
        ...defaultConfig,
        variables: {
          copyableDevDeps: {
            'expect-type': 'expect-type',
          },
        },
      }),
    },
    logger: {info: log},
  })

  expect(syncer.read()).toMatchInlineSnapshot(`
    {
      "package.json": "{
      "name": "set-variables",
      "version": "0.0.0",
      "main": "dist/index.js",
      "type": "dist/index.d.ts",
      "files": [
        "dist",
        "*.md"
      ],
      "np": {
        "cleanup": false
      },
      "scripts": {
        "eslint": "eslint --ext '.ts,.js,.md'",
        "lint": "tsc && eslint .",
        "build": "tsc -p tsconfig.lib.json",
        "test": "jest"
      },
      "devDependencies": {
        "expect-type2": "npm:expect-type@0.14.0"
      }
    }
    ",
    }
  `)

  expect(log.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "writing package.json after matching pattern ./package.json",
      ],
      [
        "skipping package.json for pattern {.,.vscode,.devcontainer,config}/*.json, already handled",
      ],
    ]
  `)
})

test('filter', async () => {
  const syncer = jestFixture({targetState: {}})
  syncer.sync()
  const log = jest.fn()

  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv, '--filter', './tsconfig*.json'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.any(String),
    'tsconfig.lib.json': expect.any(String),
  })
})

test('purge', async () => {
  const syncer = jestFixture({
    targetState: {
      'some-local-config.json': '{"foo": "bar"}',
    },
  })
  syncer.sync()
  expect(syncer.read()).toMatchObject({
    'some-local-config.json': expect.any(String),
  })
  const log = jest.fn()

  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv, '--purge'],
    logger: {info: log},
  })

  expect(syncer.read()).not.toMatchObject({
    'some-local-config.json': expect.any(String),
  })
  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.any(String),
  })
})

test('purge + filter', async () => {
  const syncer = jestFixture({
    targetState: {
      // we're going to filter to tsconfigs only, and purge, so this will be removed
      'tsconfig.local.json': '{}',
      // but this isn't included in the filter so won't be removed
      'some-local-config.json': '{"foo": "bar"}',
    },
  })
  syncer.sync()
  expect(syncer.read()).toMatchObject({
    'some-local-config.json': expect.any(String),
    'tsconfig.local.json': expect.any(String),
  })
  const log = jest.fn()

  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv, '--filter', './tsconfig*.json', '--purge'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchObject({
    'some-local-config.json': expect.any(String),
    'tsconfig.json': expect.any(String),
  })
  expect(syncer.read()).not.toMatchObject({
    'tsconfig.local.json': expect.any(String),
  })
})

test('aggressive', async () => {
  const syncer = jestFixture({
    targetState: {
      'tsconfig.json': JSON.stringify({compilerOptions: {target: 'es2018'}}, null, 2),
    },
  })
  syncer.sync()
  const log = jest.fn()

  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv, '--filter', './tsconfig.json'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.stringContaining('"target": "es2018"'),
  })

  await run({
    cwd: syncer.baseDir,
    argv: [...testArgv, '--filter', './tsconfig.json', '--aggressive'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.stringContaining('"target": "es2017"'),
  })
})

test('help', async () => {
  const log = jest.fn()

  await run({
    cwd: process.cwd(),
    argv: ['--help'],
    logger: {info: log},
  })

  expect(log.mock.calls[0][0]).toMatchInlineSnapshot(`
    "Available options:

    --help 
      Show help text.

    --repo String
      A remote repo to clone and scan for config files. This will be passed straight to \`git clone\` in a sub-shell, so should work with \`https:\` or \`ssh:\`, or any other protocol that works with \`git clone\` for you.

    --ref String
      A sha, tag, or branch to checkout on the remote repo before scanning for files. Using this can ensure you _don't_ get updated files when the remote repo pushes changes - use when you want stability rather than to be on the bleeding edge.

    --path String
      If not specifying \`--repo\`, this must be used to specify a path to a directory containing a project to copy config files from. For example, you could create a new project based on an existing one in a monorepo.

    --output String
      Directory to copy files into.

    --config String
      Use to point to a (relative path to) a JS config file, which defines a custom configuration for the tool. The configuration is used to define custom merge strategies, which can change how files are generated. See [merge strategies](#merge-strategies) for more details.
  
      You can also use the special placeholder variable \`%source%\` to require a file relative to the project you're copying from. For example:
  
      \`\`\`bash
      npx copy-config --repo someuser/somerepo --config %source%/configs/someconfig.js
      \`\`\`

    --filter String
      If you only want to copy over certain kinds of file, you can use \`--filter\` to narrow down the files that will be matched in the remote repo. For example, \`npx copy-config --repo mmkal/expect-type --filter '*.json'\` will only copy JSON files.

    --purge 
      Use this to remove all config files found locally that aren't found on the remote. This is a destructive option, so use it carefully.

    --aggressive 
      (_experimental, will probably be changed to \`--strategy aggressive\`_)
  
      Instead of the default merge strategies, use more aggressive equivalents. Merge json files, biasing to the remote content instead of local, and replace other files using the remote content directly. Like \`--purge\`, this is a potentially destructive command since it doesn't respect your local filesystem, so use carefully.
  
      >Future: This will probably become a \`--strategy\` option, to allow for \`--strategy aggressive-if-remote-newer\` or some such. That would do a \`git blame\` on each file, and aggressively update from the remote if the remote file was more recently updated, maybe.

    --diff-check String
      A command which will make sure there are no working-copy changes in the current repo. This will run before modifying your file system to avoid making changes that get mixed up with yours. This defaults to \`git diff --exit-code\`.
  
      You could set to something more fine-grained:
  
      \`\`\`bash
      npx copy-config --repo someuser/somerepo --diff-check "git diff path/to/configs --exit-code"
      \`\`\`
  
      Or something else completely:
  
      \`\`\`bash
      npx copy-config --repo someuser/somerepo --diff-check "npm run somescript"
      \`\`\`
  
      To disable checking completely you can set the command to empty string:
  
      \`\`\`bash
      npx copy-config --repo someuser/somerepo --diff-check ""
      \`\`\`"
  `)
})

test('local source with output path', async () => {
  const syncer = jestFixture({
    targetState: {
      sourcedir: {
        '.gitignore': '*.txt',
      },
      otherdir: {
        '.gitignore': '*.md',
      },
    },
  })

  syncer.sync()

  await run({
    cwd: syncer.baseDir + '/sourcedir',
    argv: ['--path', '.', '--diff-check', '', '--output', '../targetdir'],
  })

  expect(syncer.read()).toMatchInlineSnapshot(`
    {
      "otherdir": {
        ".gitignore": "*.md
    ",
      },
      "sourcedir": {
        ".gitignore": "*.txt
    ",
      },
      "targetdir": {
        ".gitignore": "*.txt",
      },
    }
  `)
})
