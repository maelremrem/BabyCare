import assert from 'node:assert/strict'
import test from 'node:test'
import { createDatabase } from './database.js'
import { createApp } from './app.js'
import { sendWebhook, validateWebhook } from './notifications.js'

const ntfy = { enabled: true, provider: 'ntfy', url: 'https://ntfy.example/topic', token: 'secret' }

test('webhook validation rejects unsafe URLs and preserves secrets only for the same destination', () => {
  assert.equal(validateWebhook({ ...ntfy, token: undefined }, ntfy).token, 'secret')
  assert.equal(validateWebhook({ ...ntfy, url: 'https://other.example/topic', token: undefined }, ntfy).token, '')
  for (const url of ['file:///etc/passwd', 'https://user:pass@example.com/topic', 'https://example.com/topic?token=secret', 'https://example.com/topic#fragment', 'https://example.com/']) {
    assert.throws(() => validateWebhook({ ...ntfy, url }))
  }
  assert.throws(() => validateWebhook({ ...ntfy, token: 'secret\r\nHeader: x' }))
  assert.throws(() => validateWebhook({ ...ntfy, provider: 'gotify' }))
  assert.throws(() => validateWebhook({ ...ntfy, provider: 'gotify', url: 'https://gotify.example/message', token: '' }))
})

test('ntfy and Gotify use their native payloads without putting tokens in URLs', async () => {
  const calls = []
  const fetcher = async (url, init) => { calls.push({ url, ...init }); return { ok: true } }
  await sendWebhook(ntfy, 'Bébé : bain', fetcher)
  await sendWebhook({ ...ntfy, provider: 'gotify', url: 'https://gotify.example/message' }, 'Bébé : bain', fetcher)
  assert.equal(calls[0].headers.Authorization, 'Bearer secret')
  assert.equal(calls[0].body, 'Bébé : bain')
  assert.equal(calls[1].headers['X-Gotify-Key'], 'secret')
  assert.deepEqual(JSON.parse(calls[1].body), { title: 'BabyCare', message: 'Bébé : bain', priority: 5 })
  assert.equal(calls[1].redirect, 'error')
  await assert.rejects(sendWebhook(ntfy, 'test', async () => ({ ok: false })))
})

test('activity survives deletion, tracks automatic timer stops and settings never expose the token', async () => {
  const db = createDatabase(':memory:')
  const app = createApp({ db, auth: null })
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, method = 'GET', body) => fetch(`${base}/api/${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Baby-Id': '1', 'X-BabyCare-Request': '1' }, body: body ? JSON.stringify(body) : undefined })
  try {
    const first = await (await request('events/start', 'POST', { type: 'nap' })).json()
    await request('events/start', 'POST', { type: 'breast_left' })
    await request(`events/${first.id}`, 'DELETE')
    const rows = await (await request('notifications?since=2000-01-01')).json()
    assert.deepEqual(rows.map(row => row.action), ['deleted', 'started', 'stopped', 'started'])
    assert.equal((await request('notifications?since=invalid')).status, 400)
    assert.equal((await request('notifications/settings', 'PUT', { ...ntfy, enabled: false })).status, 200)
    const settings = await (await request('notifications/settings')).json()
    assert.equal(settings.hasToken, true)
    assert.equal(settings.token, undefined)
    assert.equal((await request('notifications/test', 'POST')).status, 400)
  } finally { await new Promise(resolve => server.close(resolve)); db.close() }
})
