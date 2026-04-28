import { createMiddleware } from '@tanstack/react-start'

// 関数 ID は v1.167 以降の middleware option には公開されていないので、
// メタは serverFnMeta から拾えるが面倒なので timing だけ記録する。
export const loggerMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const start = Date.now()
    try {
      const result = await next()
      const ms = Date.now() - start
      console.info(`[fn] ok ${ms}ms`)
      return result
    } catch (err) {
      const ms = Date.now() - start
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[fn] err ${ms}ms ${message}`)
      throw err
    }
  },
)
