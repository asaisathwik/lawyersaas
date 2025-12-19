export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { url = '', name = 'document' } = req.query || {};
    if (typeof url !== 'string' || !url.startsWith('https://res.cloudinary.com/')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const safeName = String(name).replace(/[^\w.\- ]+/g, '_').slice(0, 180) || 'document';
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream fetch failed' });
    }
    const buf = Buffer.from(await response.arrayBuffer());
    // Force download for consistent behavior across browsers by using a generic content type
    res.setHeader('Content-Type', 'application/octet-stream');
    const encoded = encodeURIComponent(safeName);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`);
    res.setHeader('Cache-Control', 'private, max-age=0, no-cache');
    const len = response.headers.get('content-length');
    if (len) {
      res.setHeader('Content-Length', len);
    }
    res.status(200).send(buf);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('download error:', e);
    return res.status(500).json({ error: e?.message || 'download_failed' });
  }
}


