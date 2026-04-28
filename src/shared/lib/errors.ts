/**
 * 業務ドメインエラー。client に code を返して UI で分岐する。
 * server fn が throw すると TanStack Start が 500 として返すので、
 * ルート境界で classify する場合は instanceof DomainError を使う。
 */
export class DomainError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(code: string, message?: string, statusCode = 400) {
    super(message ?? code)
    this.name = 'DomainError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'unauthorized') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'forbidden') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'not found') {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}
