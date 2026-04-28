// クライアント側 fetch ヘルパ。useSuspenseQuery / useMutation から呼ぶ前提。
//
// SSR (Node) では:
//   - 相対 URL fetch は "Failed to parse URL" で死ぬ
//   - 仮に絶対 URL でも session cookie を持たないので 401 で空回り
// なので SSR では **即座に CLIENT_ONLY エラーを throw** する。
// React 19 streaming SSR の挙動:
//   - useSuspenseQuery がエラーを伝播 → 直近の Suspense boundary の fallback が SSR HTML に出力
//   - そのサブツリーは "client rendering" マーキング
//   - hydration 後に client 側で fresh queryClient + fresh queryFn が走り、HTTP fetch でデータ取得
//
// 旧実装 (never-resolving Promise) は Suspense が永遠保留され、TanStack Start の
// 60s SSR stream timeout に引っかかったので不可。

const isServer = typeof window === 'undefined'

class ClientOnlyError extends Error {
  // React がフレームワーク用 hint として扱うため digest を付ける
  digest = 'CLIENT_ONLY'
  constructor() {
    super('CLIENT_ONLY')
    this.name = 'ClientOnlyError'
  }
}

export async function getJson<T>(path: string): Promise<T> {
  if (isServer) {
    throw new ClientOnlyError()
  }
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  if (isServer) {
    throw new ClientOnlyError()
  }
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error ?? `request failed: ${res.status}`)
  }
  return data as T
}
