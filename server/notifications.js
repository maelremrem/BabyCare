const defaults = { enabled: false, provider: 'ntfy', url: '', token: '' }

export function validateWebhook(body, previous = defaults) {
  if (!body || typeof body.enabled !== 'boolean' || !['ntfy', 'gotify'].includes(body.provider) || typeof body.url !== 'string') throw new Error('invalid')
  const token = body.token === undefined ? (body.provider === previous.provider && body.url === previous.url ? previous.token : '') : body.token
  if (typeof token !== 'string' || token.length > 4096 || /[\r\n]/.test(token)) throw new Error('invalid')
  if (body.url.length > 2048) throw new Error('invalid')
  if (body.url || body.enabled) {
    const url = new URL(body.url)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname === '/') throw new Error('invalid')
    if (body.provider === 'gotify' && !url.pathname.endsWith('/message')) throw new Error('invalid')
  }
  if (body.enabled && body.provider === 'gotify' && !token) throw new Error('invalid')
  return { enabled: body.enabled, provider: body.provider, url: body.url, token }
}

export async function sendWebhook(config, message, fetcher = fetch) {
  const headers = config.provider === 'gotify'
    ? { 'Content-Type': 'application/json', 'X-Gotify-Key': config.token }
    : { 'Content-Type': 'text/plain; charset=utf-8', Title: 'BabyCare', ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}) }
  const response = await fetcher(config.url, {
    method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(5000),
    body: config.provider === 'gotify' ? JSON.stringify({ title: 'BabyCare', message, priority: 5 }) : message
  })
  await response.body?.cancel()
  if (!response.ok) throw new Error('Webhook delivery failed')
}

export function installNotifications(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS notification_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, baby_id INTEGER NOT NULL,
    baby_name TEXT NOT NULL, event_type TEXT NOT NULL, action TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ); CREATE INDEX IF NOT EXISTS notification_actions_date ON notification_actions(created_at);`)
  for (const [operation, row, action] of [['INSERT', 'NEW', "'created'"], ['UPDATE', 'NEW', "CASE WHEN OLD.status = 'running' AND NEW.status = 'completed' THEN 'stopped' ELSE 'updated' END"], ['DELETE', 'OLD', "'deleted'"]]) {
    db.exec(`CREATE TRIGGER IF NOT EXISTS notifications_${operation.toLowerCase()} AFTER ${operation} ON events BEGIN
      INSERT INTO notification_actions (baby_id, baby_name, event_type, action)
      VALUES (${row}.baby_id, COALESCE((SELECT name FROM babies WHERE id = ${row}.baby_id), ''), ${row}.type, ${operation === 'INSERT' ? "CASE WHEN NEW.status = 'running' THEN 'started' ELSE 'created' END" : action});
      DELETE FROM notification_actions WHERE id <= (SELECT MAX(id) - 1000 FROM notification_actions);
    END;`)
  }
  const read = () => JSON.parse(db.prepare("SELECT value FROM app_settings WHERE key = 'external_notifications'").get()?.value || JSON.stringify(defaults))
  const publicConfig = config => ({ enabled: config.enabled, provider: config.provider, url: config.url, hasToken: Boolean(config.token) })
  let cursor = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM notification_actions').get().id
  let pending = 0
  app.use('/api', (request, response, next) => {
    response.on('finish', () => {
      if (request.method === 'GET' || response.statusCode >= 400) return
      const rows = db.prepare('SELECT * FROM notification_actions WHERE id > ? ORDER BY id').all(cursor)
      if (rows.length) cursor = rows.at(-1).id
      const config = read()
      if (!config.enabled) return
      const labels = { created: 'Action ajoutée', started: 'Minuteur démarré', stopped: 'Minuteur terminé', updated: 'Action modifiée', deleted: 'Action supprimée' }
      for (const row of rows) {
        if (pending >= 20) break
        pending++
        sendWebhook(config, `${row.baby_name || 'Bébé'} : ${labels[row.action]} (${row.event_type})`).catch(() => console.warn('BabyCare: échec de notification externe')).finally(() => { pending-- })
      }
    })
    next()
  })
  app.get('/api/notifications', (request, response) => {
    const since = request.query.since
    if (typeof since !== 'string' || !Number.isFinite(Date.parse(since))) return response.status(400).json({ error: 'Invalid notification cursor' })
    response.json(db.prepare('SELECT * FROM notification_actions WHERE created_at > ? ORDER BY id DESC LIMIT 100').all(new Date(since).toISOString()))
  })
  app.get('/api/notifications/settings', (_request, response) => response.json(publicConfig(read())))
  app.put('/api/notifications/settings', (request, response) => {
    let config
    try { config = validateWebhook(request.body, read()) } catch { return response.status(400).json({ error: 'Configuration webhook invalide / Invalid webhook configuration' }) }
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('external_notifications', ?, ?)").run(JSON.stringify(config), new Date().toISOString())
    response.json(publicConfig(config))
  })
  app.post('/api/notifications/test', async (_request, response) => {
    const config = read()
    if (!config.enabled) return response.status(400).json({ error: 'Activez et enregistrez le webhook / Enable and save the webhook' })
    if (pending >= 20) return response.status(429).json({ error: 'Réessayez plus tard / Try again later' })
    pending++
    try { await sendWebhook(config, 'BabyCare : notification de test'); response.json({ sent: true }) }
    catch { response.status(502).json({ error: 'Échec du test : vérifiez URL, jeton et réseau / Test failed: check URL, token and network' }) }
    finally { pending-- }
  })
}
