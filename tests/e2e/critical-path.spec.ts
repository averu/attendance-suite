import { test, expect } from '@playwright/test'

// 一意な email を生成 (テスト並列実行対策)
function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

test.describe('Critical path: signup → 打刻 → 退勤', () => {
  test('owner サインアップから一日の打刻完了まで', async ({ page }) => {
    const email = uniqueEmail('owner')
    const password = 'password1234'

    // 1) /signup 画面
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: 'サインアップ' })).toBeVisible()

    await page.getByLabel('名前').fill('テスト太郎')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/Password/).fill(password)
    await page.getByLabel('組織名').fill('E2E テスト組織')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()

    // 2) /dashboard
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()

    // 3) 出勤
    await page.getByRole('button', { name: '出勤' }).click()
    await expect(page.getByText(/勤務中/)).toBeVisible()

    // 4) 休憩開始
    await page.getByRole('button', { name: '休憩開始' }).click()
    await expect(page.getByText(/休憩中/)).toBeVisible()

    // 5) 休憩終了
    await page.getByRole('button', { name: '休憩終了' }).click()
    await expect(page.getByText(/勤務中/)).toBeVisible()

    // 6) 退勤
    await page.getByRole('button', { name: '退勤' }).click()
    await expect(page.getByText(/退勤済/)).toBeVisible()

    // 7) 勤怠履歴に今日のレコードが出る
    await page.getByRole('link', { name: /勤怠履歴/ }).first().click()
    await expect(page).toHaveURL(/\/attendance/)
    await expect(page.getByRole('heading', { name: /勤怠履歴/ })).toBeVisible()
  })

  test('未ログインで /dashboard を踏むと /login へ', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('未ログインで /admin/members を踏むと /login へ', async ({ page }) => {
    await page.goto('/admin/members')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('修正申請フロー (1 アカウント簡易版)', () => {
  test('owner 自身が申請を作って承認できる', async ({ page }) => {
    const email = uniqueEmail('owner-correction')
    const password = 'password1234'

    // signup
    await page.goto('/signup')
    await page.getByLabel('名前').fill('修正太郎')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/Password/).fill(password)
    await page.getByLabel('組織名').fill('修正テスト組織')
    await page.getByRole('button', { name: 'アカウントを作成' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)

    // 修正申請を作成
    await page.getByRole('link', { name: /修正申請/ }).click()
    await expect(page).toHaveURL(/\/requests$/)

    await page.getByRole('link', { name: '新規申請' }).click()
    await expect(page).toHaveURL(/\/requests\/new/)

    // 出勤希望時刻のみ埋める
    await page.getByLabel('出勤希望時刻').fill('09:00')
    await page.getByLabel('退勤希望時刻').fill('18:00')
    await page.getByLabel('理由').fill('打刻忘れ E2E')
    await page.getByRole('button', { name: '申請する' }).click()

    // 申請一覧に戻る
    await expect(page).toHaveURL(/\/requests$/)
    await expect(page.getByText('打刻忘れ E2E')).toBeVisible()

    // owner なので /admin/requests で承認できる
    await page.goto('/admin/requests')
    await expect(page.getByRole('heading', { name: '申請の承認' })).toBeVisible()
    await page.getByRole('button', { name: '承認' }).first().click()

    // 自分の申請一覧で approved になっている
    await page.goto('/requests')
    await expect(page.getByText(/approved/)).toBeVisible()
  })
})
