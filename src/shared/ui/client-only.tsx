import { useEffect, useState } from 'react'

/**
 * 子要素を **client mount 後だけ** 描画する。
 *
 * authed ページ群は session cookie 必須の HTTP fetch を走らせるため SSR では走らせたくない。
 * `<ClientOnly>` で囲むと:
 *   - SSR: `fallback` だけが HTML に出力される (queryFn は呼ばれない → SSR エラーなし)
 *   - hydration 後: `useEffect` 経由で mounted=true に切り替わり、子要素が描画される
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return <>{mounted ? children : fallback}</>
}
