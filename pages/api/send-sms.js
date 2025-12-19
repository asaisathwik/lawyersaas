import { admin } from '../../src/lib/firebaseAdmin.js';
import { getTwilioClient, getTwilioFromConfig, validatePhoneNumberE164 } from '../../src/lib/twilio.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const requireAuth = process.env.NODE_ENV === 'production';

  try {
    if (requireAuth) {
      const authHeader = req.headers.authorization || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) {
        return res.status(401).json({ error: 'Missing auth token' });
      }
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (!decoded?.uid) {
        return res.status(401).json({ error: 'Invalid auth token' });
      }
    }

    const { to, body } = req.body || {};
    if (!to || !body) {
      return res.status(400).json({ error: 'Missing "to" or "body"' });
    }
    if (!validatePhoneNumberE164(to)) {
      return res.status(400).json({ error: 'Phone must be E.164 format, e.g. +15555550123' });
    }

    const client = getTwilioClient();
    const fromCfg = getTwilioFromConfig();

    const message = await client.messages.create({
      to,
      body,
      ...fromCfg,
    });

    return res.status(200).json({
      sid: message.sid,
      status: message.status,
      to: message.to,
      dateCreated: message.dateCreated,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('send-sms error:', e);
    return res.status(500).json({ error: e?.message || 'sms_failed' });
  }
}


