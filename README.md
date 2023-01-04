# copy-config

Copies another repo's configuration

## The idea

Save hours setting up new repos, or months living without proper DX on existing ones, by borrowing the configuration from another project.

There are lots of zero-config or low-config tools that come and go - [tsdx](https://npmjs.com/package/tsdx), [microbundle](https://www.npmjs.com/package/microbundle), [heft](https://rushstack.io/pages/heft/overview). Most are pretty well documented, and some are pretty good at staying up to date with their supported typescript, jest, eslint versions.

But there's a big cost in investing in these magical options, and you might find yourself spending hours learning the configurations of those tools, the quirks of their implementations, and their limitations.

This tool offers a simpler approach - it's really just the equivalent of you poking around another project, and copy-pasting the bits of config that make it work. But it takes seconds, not hours. And it works with all versions of all toolchains, even ones that don't exist yet.

## How to use

```
npx copy-config --repo mmkal/expect-type
```

The above command will:

1. Clone the repo at https://github.com/mmkal/expect-type into a temporary directory
1. Search the cloned repo for configuration files. This includes package.json, tsconfig.json, eslint, prettier, jest, babel, esbuild, swc, webpack, rollup, parcel, ts-node, and vscode configuration files.
1. Copy what it judges to be the relevant parts of those configuration files into the current working directory (usually, another git repo or project)
1. Merge files using what it judges to be sensible defaults.

A note on the words "relevant" and "sensible" above: these are subjective. In the case of most files, it will write the remote file content if no local equivalent exists. Otherwise, it leaves the local file alone. In the case of package.json files, it will collect some devDependencies matching a whitelist of substrings, and some `scripts` and other boilerplate-ish pieces of configuration too, then merge with the local package.json file (if it exists), using [`lodash.defaultsDeep`](https://lodash.com/docs/4.17.15#defaultsDeep). Other json files will be directly merged using [`lodash.defaultsDeep`](https://lodash.com/docs/4.17.15#defaultsDeep).

## Options

⚠️ Note: these options are fresh and might change, until this library reaches v1. If you're using them, follow the repo's releases to watch for breaking changes. ⚠️

### `--repo`

A remote repo to clone and scan for config files.

### `--ref`

A sha, tag, or branch to checkout on the remote repo before scanning for files. Using this can ensure you _don't_ get updated files when the remote repo pushes changes - use when you want stability rather than to be on the bleeding edge.

### `--filter`

If you only want to copy over certain kinds of file, you can use `--filter` to narrow down the files that will be matched in the remote repo. For example, `npx copy-config --repo mmkal/expect-type --filter '*.json'` will only copy JSON files.

### `--purge`

Use this to remove all config files found locally that aren't found on the remote. This is a destructive option, so use it carefully.

### `--aggressive` (_experimental, will probably be changed to `--strategy aggressive`_)

Instead of the default merge strategies, use more aggressive equivalents. Merge json files, biasing to the remote content instead of local, and replace other files using the remote content directly. Like `--purge`, this is a potentially destructive command since it doesn't respect your local filesystem, so use carefully.

>Future: This will probably become a `--strategy` option, to allow for `--strategy aggressive-if-remote-newer` or some such. That would do a `git blame` on each file, and aggressively update from the remote if the remote file was more recently updated, maybe.

### `--config`

Use to point to a (relative path to) a JS config file, which defines a custom configuration for the tool. The configuration is used to define custom merge strategies, which can change how files are generated. See [merge strategies](#merge-strategies) for more details.

## Merge strategies

You might use this once, and find it useful. Or, you might want to continually "borrow" someone else's carefully-crafted configuration, every day. If you do use it regularly, you will probably eventually need to customise the merge algorithm. You can do this by creating a config file called, say `copy-config.cjs`:

```js
const copyConfig = require('copy-config')

/** @type {import('copy-config').Config} */
module.exports = {
    rules: [
        ...copyConfig.rules,
        {
            pattern: 'package.json',
            merge: ({localContent, remoteContent}) => {
              const merged = mergeTheTwoValuesSomeCustomWay(localContent, remoteContent)
              return JSON.stringify(merged, null, 2) + '\n'
            }
        }
    ]
}
```
