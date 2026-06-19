/**
 * End-to-end Mood Board persistence test.
 * Uses the local Chrome profile session (already logged in) + Supabase API verify.
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env */ }
  return {
    url: process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
    email: process.env.TEST_MOODBOARD_EMAIL || env.TEST_MOODBOARD_EMAIL,
    password: process.env.TEST_MOODBOARD_PASSWORD || env.TEST_MOODBOARD_PASSWORD,
  }
}

// Minimal valid 1x1 PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const pngBuffer = Buffer.from(PNG_BASE64, 'base64')

async function getAuthenticatedClient(config) {
  const sb = createClient(config.url, config.key)

  if (config.email && config.password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    })
    if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message}`)
    return { sb, userId: data.user.id, session: data.session }
  }

  // Extract session from Chrome profile localStorage
  const chromeProfile = join(homedir(), 'Library/Application Support/Google/Chrome/Default')
  const browser = await chromium.launchPersistentContext(chromeProfile, {
    headless: true,
    channel: 'chrome',
  })
  const page = browser.pages()[0] || await browser.newPage()
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 })

  const session = await page.evaluate((supabaseUrl) => {
    const ref = new URL(supabaseUrl).hostname.split('.')[0]
    const key = `sb-${ref}-auth-token`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }, config.url)

  await browser.close()

  if (!session?.access_token || !session?.user?.id) {
    throw new Error('No Supabase session in Chrome — log in at http://localhost:5173 first')
  }

  await sb.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  return { sb, userId: session.user.id, session }
}

async function apiPersistenceTest(sb, userId) {
  const testId = `e2e-${Date.now()}`
  const testImage = {
    id: testId,
    src: `https://example.com/${testId}.png`,
    caption: 'E2E test image',
    category: 'Overall Vision',
    notes: '',
  }

  const { data: before } = await sb.from('moodboard_data')
    .select('images,swatches')
    .eq('user_id', userId)
    .maybeSingle()

  const existingImages = Array.isArray(before?.images) ? before.images : []
  const swatches = Array.isArray(before?.swatches) ? before.swatches : []
  const nextImages = [...existingImages, testImage]

  const { data: saved, error: saveErr } = await sb.from('moodboard_data')
    .upsert({ user_id: userId, images: nextImages, swatches }, { onConflict: 'user_id' })
    .select('images')
    .single()

  if (saveErr) throw new Error(`API save failed: ${saveErr.message}`)
  if ((saved.images ?? []).length < nextImages.length) {
    throw new Error(`API verify failed: expected ${nextImages.length}, got ${saved.images?.length}`)
  }

  const { data: reloaded, error: loadErr } = await sb.from('moodboard_data')
    .select('images')
    .eq('user_id', userId)
    .single()

  if (loadErr) throw new Error(`API reload failed: ${loadErr.message}`)
  if (!(reloaded.images ?? []).some(i => i.id === testId)) {
    throw new Error('API reload: test image not found')
  }

  const cleaned = (reloaded.images ?? []).filter(i => i.id !== testId)
  await sb.from('moodboard_data')
    .upsert({ user_id: userId, images: cleaned, swatches }, { onConflict: 'user_id' })

  console.log('✓ API persistence test passed')
}

function authStorageKey(supabaseUrl) {
  const ref = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

async function uiTest(session, config) {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173'
  const testPng = join(root, 'scripts', '.e2e-test.png')
  writeFileSync(testPng, pngBuffer)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.addInitScript(({ key, sessionData }) => {
    localStorage.setItem(key, JSON.stringify(sessionData))
  }, { key: authStorageKey(config.url), sessionData: session })
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(err.message))

  const navigateToMoodBoard = async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1000)
    if (await page.getByText('Sign in').isVisible().catch(() => false)) {
      throw new Error('Auth screen shown — please log in via Chrome first')
    }
    await page.getByRole('button', { name: /Planning/i }).first().click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Mood Board', exact: true }).click()
    await page.waitForTimeout(800)
    await page.getByText('Loading mood board').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})
  }

  const runOnce = async (runNum) => {
    console.log(`\n— UI test run ${runNum} —`)
    await navigateToMoodBoard()

    const beforeCount = await page.locator('.page-content img[alt]').count()

    await page.locator('#main-scroll input[type="file"][accept="image/*"]').setInputFiles(testPng)

    // Progress may flash quickly; ensure uploading state clears
    await page.getByText(/Uploading/i).waitFor({ state: 'hidden', timeout: 45000 })

    await page.waitForTimeout(2000)

    const uploadingVisible = await page.getByText(/Uploading/i).isVisible().catch(() => false)
    if (uploadingVisible) throw new Error(`Run ${runNum}: loading stuck after upload`)

    const afterCount = await page.locator('.page-content img[alt]').count()
    if (afterCount <= beforeCount) {
      const saveErr = await page.getByText(/Save error:/i).textContent().catch(() => null)
      throw new Error(`Run ${runNum}: image not in grid (before=${beforeCount}, after=${afterCount})${saveErr ? ` — ${saveErr}` : ''}`)
    }
    console.log(`✓ Run ${runNum}: loading cleared, image visible (${afterCount} images)`)

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await navigateToMoodBoard()

    const afterReload = await page.locator('.page-content img[alt]').count()
    if (afterReload <= beforeCount) {
      throw new Error(`Run ${runNum}: image missing after refresh (before=${beforeCount}, afterReload=${afterReload})`)
    }
    console.log(`✓ Run ${runNum}: image survived hard refresh (${afterReload} images)`)
  }

  try {
    await runOnce(1)
    await runOnce(2)
  } finally {
    await browser.close()
    try { unlinkSync(testPng) } catch { /* ignore */ }
  }

  const moodErrors = errors.filter(e => /moodboard|persist|save/i.test(e))
  if (moodErrors.length) console.warn('Console errors:', moodErrors.slice(0, 5))
  console.log('\n✓ UI persistence tests passed (2 runs)')
}

async function main() {
  const config = loadEnv()
  if (!config.url || !config.key) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
    process.exit(1)
  }

  const { sb, userId, session } = await getAuthenticatedClient(config)
  console.log('✓ Authenticated for API tests')

  await apiPersistenceTest(sb, userId)
  await uiTest(session, config)

  console.log('\n✅ All Mood Board E2E tests passed')
}

main().catch(err => {
  console.error('\n❌ E2E test failed:', err.message)
  process.exit(1)
})