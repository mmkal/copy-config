import {jestFixture} from 'fs-syncer'
import {run} from '../src/run'

test('aggressive overwrites', async () => {
  const syncer = jestFixture({targetState: {
    "tsconfig.json": JSON.stringify({compilerOptions: {target: 'es2018'}}, null, 2)
  }})
  syncer.sync()
  const log = jest.fn()

  await run({
    cwd: syncer.baseDir,
    argv: ['--repo', 'mmkal/eslint-plugin-codegen', '--ref', 'v0.17.0', '--filter', './tsconfig.json'],
    logger: {info: log},
  })

  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.stringContaining('"target": "es2018"'),
  })

  await run({
    cwd: syncer.baseDir,
    argv: ['--repo', 'mmkal/eslint-plugin-codegen', '--ref', 'v0.17.0', '--filter', './tsconfig.json', '--aggressive'],
    logger: {info: log},
  })
  
  expect(syncer.read()).toMatchObject({
    'tsconfig.json': expect.stringContaining('"target": "es2017"'),
  })
})
