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

Or copy from a local path, for example in a monorepo:

```
npx copy-config --path ../some-pkg
```

This will do the same as the above, but instead of cloning a repo, it uses the specified path (absolute, or relative to the current working directory) as the project directory to copy config files from.

When the current working directory is an existing project, you can use `--output` to create a new project with the same config:

```sh
npx copy-config --path . --output ../new-pkg
```

## Options

⚠️ Note: these options are fresh and might change, until this library reaches v1. If you're using them, follow the repo's releases to watch for breaking changes. ⚠️

### `--repo`

A remote repo to clone and scan for config files. This will be passed straight to `git clone` in a sub-shell, so should work with `https:` or `ssh:`, or any other protocol that works with `git clone` for you.

### `--ref`

A sha, tag, or branch to checkout on the remote repo before scanning for files. Using this can ensure you _don't_ get updated files when the remote repo pushes changes - use when you want stability rather than to be on the bleeding edge.

### `--path`

If not specifying `--repo`, this must be used to specify a path to a directory containing a project to copy config files from. For example, you could create a new project based on an existing one in a monorepo.

### `--output`

Directory to copy files into.

### `--filter`

If you only want to copy over certain kinds of file, you can use `--filter` to narrow down the files that will be matched in the remote repo. For example, `npx copy-config --repo mmkal/expect-type --filter '*.json'` will only copy JSON files.

### `--purge`

Use this to remove all config files found locally that aren't found on the remote. This is a destructive option, so use it carefully.

### `--aggressive` (_experimental, will probably be changed to `--strategy aggressive`_)

Instead of the default merge strategies, use more aggressive equivalents. Merge json files, biasing to the remote content instead of local, and replace other files using the remote content directly. Like `--purge`, this is a potentially destructive command since it doesn't respect your local filesystem, so use carefully.

>Future: This will probably become a `--strategy` option, to allow for `--strategy aggressive-if-remote-newer` or some such. That would do a `git blame` on each file, and aggressively update from the remote if the remote file was more recently updated, maybe.

### `--config`

Use to point to a (relative path to) a JS config file, which defines a custom configuration for the tool. The configuration is used to define custom merge strategies, which can change how files are generated. See [merge strategies](#merge-strategies) for more details.

You can also use the special placeholder variable `%source%` to require a file relative to the project you're copying from. For example:

```bash
npx copy-config --repo someuser/somerepo --config %source%/configs/someconfig.js
```

### `--diff-check`

A command which will make sure there are no working-copy changes in the current repo. This will run before modifying your file system to avoid making changes that get mixed up with yours. This defaults to `git diff --exit-code`.

You could set to something more fine-grained:

```bash
npx copy-config --repo someuser/somerepo --diff-check "git diff path/to/configs --exit-code"
```

Or something else completely:

```bash
npx copy-config --repo someuser/somerepo --diff-check "npm run somescript"
```

To disable checking completely you can set the command to empty string:

```bash
npx copy-config --repo someuser/somerepo --diff-check ""
```

### `--help`

Show help text.

## Configuration

You might use this once, and find it useful. Or, you might want to continually "borrow" someone else's carefully-crafted configuration, every day. If you do use it regularly, you might need to customise it somehow.

### Merge strategy

One customization you can apply is the merge algorithm. You can do this by creating a config file called, say `copy-config.cjs`:

```js
const {defaultConfig} = require('copy-config')

/** @type {import('copy-config').Config} */
module.exports = {
    ...defaultConfig,
    rules: [
        ...defaultConfig.rules,
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

### Variables

🚧 The structure of the `variables` property is very likely to change somewhat in the near future. Add `// @ts-check` to the top of javascript files to make sure you spot any breaking changes. 🚧

Some of the default merge strategies use variables which can be configured as part of a config as well. For example, `copyableDevDeps` is used by the default `package.json` merge function, to ensure commonly-used tools have their various ancilliary dev dependencies installed too (eslint, prettier, jest, webpack, etc.). If you want to copy more, or fewer, dev dependencies, you can override the `variables` property in the config:

```js
const {defaultConfig} = require('copy-config')

/** @type {import('copy-config').Config} */
module.exports = {
    ...defaultConfig,
    variables: {
        copyableDevDeps: {
            vite: 'vite',
        },
    },
}
```

# Why

## What about yeoman

1. It's not just project-scaffolding. You can _re_-run the command to update configs.
2. There's some smartness built in (not much, but IMHO a sensible amount). This means you can steal configs from anywhere, not just special scaffold projects.
3. Scaffolding projects are often toy examples, unmaintained or unrealistic. This lets you borrow config from places you _know_ work.
4. This corresponds more closely to what you (or I) do manually. Find a project you like the set-up of, look at all the dev dependencies, config files, etc. and do a bunch of copy-pasting, adjusting for things like project names, etc.
