/**
 * json-bigint 无自带类型声明；最小封装供 TS 使用。
 */
declare module 'json-bigint' {
  export interface JsonBigIntOptions {
    storeAsString?: boolean
    strict?: boolean
    useNativeBigInt?: boolean
    alwaysParseAsBig?: boolean
    protoAction?: 'error' | 'ignore' | 'preserve'
    constructorAction?: 'error' | 'ignore' | 'preserve'
  }
  function jsonBigInt(options?: JsonBigIntOptions): {
    parse(text: string): unknown
    stringify(value: unknown): string
  }
  export default jsonBigInt
}
