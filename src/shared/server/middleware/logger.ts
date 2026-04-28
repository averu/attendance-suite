import { createMiddleware } from '@tanstack/react-start'

export const loggerMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, functionId }) => {
    const start = Date.now()
    try {
      const result = await next()
      const ms = Date.now() - start
      console.info(`[fn] ${functionId} ok ${ms}ms`)
      return result
    } catch (err) {
      const ms = Date.now() - start
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[fn] ${functionId} err ${ms}ms ${message}`)
      throw err
    }
  },
)
