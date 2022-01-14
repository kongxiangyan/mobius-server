import { esAddOne } from './add/add'
export * from './add/add'
export const tsAddOne = (n: number): number => esAddOne(n)

console.log(tsAddOne(1) + 2)
