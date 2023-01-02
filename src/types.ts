export type Merge = (params: {path: string; remoteContent: string; localContent: string | undefined}) => string

export interface Rule {
    pattern: string
    merge: Merge
}

export interface Config {
    rules: readonly Rule[]
}
