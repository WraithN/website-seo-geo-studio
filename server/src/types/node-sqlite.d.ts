/**
 * node:sqlite 的类型声明。
 * @types/node 的稳定版本尚未包含 node:sqlite（Node 22 需 --experimental-sqlite），
 * 这里补一份最小声明，保证 server 侧类型检查可通过。
 */
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location?: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
    open(): void;
  }

  export interface StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    iterate(...params: any[]): IterableIterator<any>;
    setAllowBareNamedParameters(allow: boolean): void;
    setReadBigInts(readBigInts: boolean): void;
  }
}
