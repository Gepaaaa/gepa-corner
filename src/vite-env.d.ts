/// <reference types="vite/client" />

declare module '*.mjs' {
  const handler: any;
  export default handler;
  export const memoryUsers: any;
  export const memoryTransactions: any;
  export const saveUsersToDisk: any;
  export const saveTransactionsToDisk: any;
}

declare module '*.js' {
  const handler: any;
  export default handler;
}
