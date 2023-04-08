import {jsonAggressiveMerge, jsonRemoteDefaults} from '../src/merge'

test('remote defaults', () => {
  // effectively just a test for lodash.defaultsDeep but it's hard to remember how it works, so this makes it eyeball-able
  const merged = jsonRemoteDefaults({
    remoteContent: JSON.stringify({a: 1, b: {c: 3, d: undefined}, x: 9}),
    localContent: JSON.stringify({a: 1.5, b: {c: undefined, d: 4}}), // will "win" in a conflict
    meta: {} as any,
  })
  expect(JSON.parse(merged)).toMatchInlineSnapshot(`
    {
      "a": 1.5,
      "b": {
        "c": 3,
        "d": 4,
      },
      "x": 9,
    }
  `)
})

test('aggressive merge', () => {
  // effectively just a test for lodash.merge but it's hard to remember how it works, so this makes it eyeball-able
  const merged = jsonAggressiveMerge({
    remoteContent: JSON.stringify({a: 1, b: {c: 3, d: undefined}, x: 9}),
    localContent: JSON.stringify({a: 1.5, b: {c: undefined, d: 4}}), // will "lose" in a conflict
    meta: {} as any,
  })
  expect(JSON.parse(merged)).toMatchInlineSnapshot(`
    {
      "a": 1,
      "b": {
        "c": 3,
        "d": 4,
      },
      "x": 9,
    }
  `)
})
