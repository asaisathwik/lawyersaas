import { admin, getAdminFirestore } from '../../src/lib/firebaseAdmin.js';
import { getTwilioClient, getTwilioFromConfig } from '../../src/lib/twilio.js';

function isAuthorized(req) {
  const dev = process.env.NODE_ENV !== 'production';
  if (dev) return true;
  const header = req.headers['x-cron-secret'] || req.headers['x-cron-key'] || '';
  const query = req.query?.secret || '';
  const secret = process.env.CRON_SECRET || '';
  return secret && (header === secret || query === secret);
}

function normalizePhoneToE164Local(phone) {
  if (!phone) return null;
  const trimmed = String(phone).replace(/[^\d+]/g, '');
  if (typeof trimmed === 'string' && /^\+\d{7,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) {
    return `+91${digits}`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getAdminFirestore();
    const nowTs = Date.now();

    // Fetch due hearings by scheduled timestamp
    const qSnap = await db
      .collection('hearings')
      .where('reminder_scheduled_ts', '<=', nowTs)
      .orderBy('reminder_scheduled_ts', 'asc')
      .limit(20)
      .get();

    if (qSnap.empty) {
      return res.status(200).json({ processed: 0, sent: 0 });
    }

    const client = getTwilioClient();
    const fromCfg = getTwilioFromConfig();

    let processed = 0;
    let sent = 0;

    for (const docSnap of qSnap.docs) {
      const hearing = docSnap.data() || {};
      if (hearing.reminder_sent === true) {
        processed += 1;
        continue;
      }

      const caseId = hearing.case_id;
      if (!caseId) {
        processed += 1;
        continue;
      }

      // Load the case to identify the owner/user and details
      const caseSnap = await db.collection('cases').doc(caseId).get();
      if (!caseSnap.exists) {
        processed += 1;
        continue;
      }
      const caseData = caseSnap.data() || {};

      const userId = caseData.user_id;
      if (!userId) {
        processed += 1;
        continue;
      }

      // Load user profile to get mobile
      const userSnap = await db.collection('users').doc(userId).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const rawPhone = userData?.mobile || userData?.phone || '';
      const to = normalizePhoneToE164Local(rawPhone);
      if (!to) {
        // Mark as processed to avoid retry loops when phone invalid
        await docSnap.ref.update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          reminder_result: 'skipped_invalid_phone',
        });
        processed += 1;
        continue;
      }

      // Compose message
      const hearingDate = hearing.hearing_date
        ? new Date(hearing.hearing_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'upcoming date';
      const caseLabel =
        caseData.case_number ||
        caseData.client_name ||
        (caseId.length > 6 ? `Case ${caseId.slice(-6)}` : `Case ${caseId}`);
      const stage = hearing.next_stage || caseData.next_stage || '';

      const bodyParts = [
        `Reminder: Hearing on ${hearingDate}`,
        `Case: ${caseLabel}`,
      ];
      if (stage) bodyParts.push(`Stage: ${stage}`);
      const body = bodyParts.join(' | ');

      try {
        const message = await client.messages.create({
          to,
          body,
          ...fromCfg,
        });
        await docSnap.ref.update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          reminder_sid: message.sid || null,
          reminder_status: message.status || null,
        });
        sent += 1;
      } catch (e) {
        // Mark as processed to avoid tight loops; future runs can retry if needed by clearing flags
        await docSnap.ref.update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
          reminder_error: e?.message || String(e),
        });
      }

      processed += 1;
    }

    return res.status(200).json({ processed, sent });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('process-reminders error:', e);
    return res.status(500).json({ error: e?.message || 'processing_failed' });
  }
}


