// Calendar feed for شجرتنا.
//   /api/ics?id=12  -> one event, with reminders 1 day and 1 hour before (for "add to my calendar")
//   /api/ics        -> all upcoming and recent events (for subscribing with webcal://)
// Reads through the public Supabase API, so it only ever sees what a visitor could see.

const SUPABASE_URL = 'https://clyhtvvddfkbmtbrkqdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZHqVlzoQzgOKTEGsU2w0AQ_jUGbe2tn';
const KIND = { wedding: 'زواج', gathering: 'جمعة عائلية', meeting: 'لقاء', other: 'مناسبة' };

const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// RFC 5545: lines longer than 75 octets are folded; never split a UTF-8 character.
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '', len = 0, limit = 75;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (len + b > limit) { out.push(cur); cur = ''; len = 0; limit = 74; }
    cur += ch; len += b;
  }
  if (cur) out.push(cur);
  return out.join('\r\n ');
}

function vevent(e, host, withAlarms) {
  const start = new Date(e.starts_at);
  const end = e.ends_at ? new Date(e.ends_at) : new Date(start.getTime() + 3 * 3600e3);
  const page = `https://${host}/events.html#event-${e.id}`;
  const desc = [KIND[e.kind] || '', e.description || '', e.map_url ? 'الموقع: ' + e.map_url : '', page].filter(Boolean).join('\n\n');
  const L = [
    'BEGIN:VEVENT',
    `UID:event-${e.id}@${host}`,
    `DTSTAMP:${stamp(e.updated_at || e.created_at || Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location_name ? `LOCATION:${esc(e.location_name)}` : null,
    `DESCRIPTION:${esc(desc)}`,
    `URL:${page}`
  ];
  if (withAlarms) {
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P1D', `DESCRIPTION:${esc('غدًا: ' + e.title)}`, 'END:VALARM');
    L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT1H', `DESCRIPTION:${esc('بعد ساعة: ' + e.title)}`, 'END:VALARM');
  }
  L.push('END:VEVENT');
  return L.filter(Boolean);
}

module.exports = async (req, res) => {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const id = req.query && req.query.id ? String(req.query.id) : '';
    if (id && !/^\d{1,12}$/.test(id)) { res.status(400).send('bad id'); return; }
    const since = new Date(Date.now() - 60 * 864e5).toISOString();
    const q = id ? `id=eq.${id}` : `starts_at=gte.${encodeURIComponent(since)}&order=starts_at.asc&limit=500`;
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&${q}`, { headers });
    if (!r.ok) { res.status(502).send('upstream error'); return; }
    const rows = await r.json();
    if (id && !rows.length) { res.status(404).send('not found'); return; }

    let calName = 'فعاليات العائلة';
    try {
      const s = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_site_status`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' });
      if (s.ok) { const j = await s.json(); if (j && j.family_name && j.family_name !== 'العائلة') calName = 'فعاليات عائلة ' + j.family_name; }
    } catch (_) {}

    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//shajaratna//family-events//AR', 'CALSCALE:GREGORIAN',
      id ? 'METHOD:PUBLISH' : null, `X-WR-CALNAME:${esc(calName)}`, 'X-WR-TIMEZONE:Asia/Riyadh',
      id ? null : 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', id ? null : 'X-PUBLISHED-TTL:PT6H'].filter(Boolean);
    rows.forEach(e => lines.push(...vevent(e, host, true)));
    lines.push('END:VCALENDAR');
    const body = lines.map(fold).join('\r\n') + '\r\n';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `${id ? 'attachment' : 'inline'}; filename="${id ? 'event-' + id : 'family-events'}.ics"`);
    res.setHeader('Cache-Control', id ? 'no-store' : 'public, max-age=900');
    res.status(200).send(body);
  } catch (err) {
    res.status(500).send('error');
  }
};
