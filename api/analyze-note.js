export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { noteId } = req.body || {};
  const url = process.env.SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY, anon = process.env.SUPABASE_ANON_KEY;
  if (!token || !noteId || !url || !service || !anon || !process.env.GITHUB_MODELS_TOKEN) return res.status(400).json({ error: 'Missing configuration' });
  const headers = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' };
  try {
    // The browser obtains this JWT through Supabase anonymous auth. Validate it
    // before permitting a server-side call that can consume the GitHub Models quota.
    const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
    const noteRes = await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}&select=*`, { headers });
    const [note] = await noteRes.json(); if (!note) throw new Error('Note not found');
    const signed = await Promise.all((note.image_paths || []).slice(0, 8).map(async path => {
      const r = await fetch(`${url}/storage/v1/object/sign/screenshots/${path}`, { method: 'POST', headers, body: JSON.stringify({ expiresIn: 300 }) });
      const d = await r.json(); return `${url}/storage/v1${d.signedURL}`;
    }));
    const prompt = `Analyze these shared market images as one product or topic. Return JSON only with keys: category (New Launch, Trend Insight, Ingredient Intelligence, Packaging Design, Pricing Strategy, Channel & Marketing, Other), title, brand, source, price, launch_date, market, core_highlight, core_benefit, consumer_insight, ocr_text. Keep facts grounded in the images. Core Benefit must preserve claim wording with “Claims” when appropriate. Write concise direct insights; do not use “not X but Y” phrasing.`;
    const body = { model: 'openai/gpt-4.1', response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...signed.map(url => ({ type: 'image_url', image_url: { url } }))] }] };
    const aiRes = await fetch('https://models.github.ai/inference/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GITHUB_MODELS_TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) });
    if (!aiRes.ok) throw new Error(await aiRes.text());
    const ai = await aiRes.json(); const result = JSON.parse(ai.choices[0].message.content.replace(/^```json|```$/g, '').trim());
    const fields = ['category','title','brand','source','price','launch_date','market','core_highlight','core_benefit','consumer_insight','ocr_text'];
    const update = Object.fromEntries(fields.filter(k => typeof result[k] === 'string').map(k => [k, result[k].slice(0, 8000)]));
    update.status = 'Ready'; update.last_edited_by_name = 'New Finds'; update.last_edited_at = new Date().toISOString();
    const saved = await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(update) });
    if (!saved.ok) throw new Error(await saved.text()); res.status(200).json({ note: (await saved.json())[0] });
  } catch (error) {
    await fetch(`${url}/rest/v1/screenshot_notes?id=eq.${encodeURIComponent(noteId)}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'Pending Analysis' }) });
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
}

