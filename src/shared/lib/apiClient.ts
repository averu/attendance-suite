// クライアント側 fetch ヘルパ。loader 経由ではなく useSuspenseQuery/useMutation から呼ぶ前提。
// SSR では使われない (authed routes は client mount で取得する設計)。

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
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
