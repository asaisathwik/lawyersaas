import sgMail from '@sendgrid/mail';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

  
// Initialize Firebase (client SDK; safe with public config)
function getDb() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

function getISTParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  const HH = map.hour;
  const MM = map.minute;
  return { dateStr: `${yyyy}-${mm}-${dd}`, timeStr: `${HH}:${MM}`, yyyy, mm, dd, HH, MM };
}

function pad2(n) { return String(n).padStart(2, '0'); }

function addDaysIST(days) {
  const now = new Date();
  // shift by days in IST by creating a date with IST midnight math
  const { yyyy, mm, dd } = getISTParts(now);
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return getISTParts(d).dateStr;
}

function isWithinWindow(targetHHMM, nowHH, nowMM, windowMinutes = 5) {
  if (!targetHHMM) return false;
  const [tH, tM] = targetHHMM.split(':').map((v) => parseInt(v, 10));
  const nowTotal = nowHH * 60 + nowMM;
  const tgtTotal = tH * 60 + tM;
  return Math.abs(nowTotal - tgtTotal) <= windowMinutes;
}

function formatIndianDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return isoDate;
  }
}

function buildEmailHtml(hearings, opts = {}) {
  const {
    brandName = 'Case Manager',
    logoUrl = '',
    supportEmail = '',
    greetingName = '',
    appUrl = '',
  } = opts || {};

  const headerLogo = logoUrl
    ? `<img src="${logoUrl}" height="32" alt="${brandName}" style="display:block; max-height:32px;" />`
    : `<div style="font-weight:700;font-size:18px;color:#0f172a">${brandName}</div>`;

  const rows = hearings.map((h) => {
    const dateStr = formatIndianDate(h.date);
    const nextStage = h.next_stage ? `<div style="color:#475569;font-size:12px;margin-top:4px;">Next Stage: ${h.next_stage}</div>` : '';
    const notes = h.notes ? `<div style="color:#475569;font-size:12px;margin-top:4px;">Notes: ${h.notes}</div>` : '';
    const viewUrl = appUrl && h.case_id ? `${appUrl.replace(/\/$/, '')}/case/${h.case_id}` : '';
    const viewLink = viewUrl ? `<div style="margin-top:8px;"><a href="${viewUrl}" style="color:#0f172a;text-decoration:none;font-weight:600;">View Case →</a></div>` : '';
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:600;color:#0f172a;">${dateStr}</div>
          <div style="color:#0f172a;margin-top:2px;">
            ${h.client_name || 'Case'} ${h.case_number ? `(${h.case_number})` : ''}
          </div>
          <div style="color:#475569;margin-top:2px;">${h.court_name || 'Court'}</div>
          ${nextStage}
          ${notes}
          ${viewLink}
        </td>
      </tr>
    `;
  }).join('');

  const introGreeting = greetingName
    ? `Hi ${greetingName},`
    : 'Hello,';

  const supportBlock = supportEmail
    ? `<div style="color:#64748b;font-size:12px;">Questions? Contact us at <a href="mailto:${supportEmail}" style="color:#0f172a;text-decoration:none;">${supportEmail}</a>.</div>`
    : '';

  const actionButton = appUrl
    ? `<a href="${appUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Open ${brandName}</a>`
    : '';

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:20px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                ${headerLogo}
              </td>
            </tr>
            <tr>
              <td style="padding:20px;">
                <div style="color:#0f172a;font-size:16px;margin-bottom:8px;">${introGreeting}</div>
                <div style="color:#334155;font-size:14px;margin-bottom:16px;">
                  You have the following upcoming hearing(s):
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;">
                  ${rows}
                </table>
                <div style="margin-top:16px;">
                  ${actionButton}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;border-top:1px solid #e2e8f0;">
                <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Times shown are based on IST.</div>
                ${supportBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

function buildEmailText(hearings, opts = {}) {
  const { brandName = 'Case Manager', greetingName = '' } = opts || {};
  const hello = greetingName ? `Hi ${greetingName},` : 'Hello,';
  const list = hearings.map((h) => {
    const dateStr = formatIndianDate(h.date);
    const title = `${h.client_name || 'Case'}${h.case_number ? ` (${h.case_number})` : ''}`;
    const court = h.court_name || 'Court';
    const extras = [h.next_stage ? `Next Stage: ${h.next_stage}` : '', h.notes ? `Notes: ${h.notes}` : '']
      .filter(Boolean)
      .join(' | ');
    const base = `• ${dateStr} — ${title} at ${court}`;
    const viewUrl = opts.appUrl && h.case_id ? `${opts.appUrl.replace(/\/$/, '')}/case/${h.case_id}` : '';
    const withExtras = extras ? `${base}\n  ${extras}` : base;
    return viewUrl ? `${withExtras}\n  ${viewUrl}` : withExtras;
  }).join('\n\n');
  return `${hello}

You have the following upcoming hearing(s):

${list}

— ${brandName}
(Times are in IST)
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  try {
    // Optional cron protection
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM = process.env.NOTIFY_FROM_EMAIL; // must match verified Single Sender or domain sender
    if (!SENDGRID_API_KEY || !FROM) {
      return res.status(500).json({ error: 'Missing SENDGRID_API_KEY or NOTIFY_FROM_EMAIL' });
    }
    sgMail.setApiKey(SENDGRID_API_KEY);
    const db = getDb();

    const now = new Date();
    const { dateStr: todayStr, HH, MM } = getISTParts(now);
    // Allow configuring a single constant daily send time and offset via env
    const DAILY_HHMM = process.env.NOTIFY_DAILY_HHMM || '18:00'; // IST
    const OFFSET_DAYS = Number.isFinite(parseInt(process.env.NOTIFY_OFFSET_DAYS || '', 10))
      ? parseInt(process.env.NOTIFY_OFFSET_DAYS || '1', 10)
      : 1; // 1 => day-before, 0 => same-day
    const withinDefaultTime = isWithinWindow(DAILY_HHMM, parseInt(HH, 10), parseInt(MM, 10), 10);
    const targetDateStr = addDaysIST(OFFSET_DAYS);

    // Collect candidates:
    // 1) Custom schedule for today (hearing_date == today && notification_time ~ now)
    const todaysSnap = await getDocs(query(collection(db, 'hearings'), where('hearing_date', '==', todayStr)));
    const customDue = [];
    todaysSnap.forEach((d) => {
      const h = d.data();
      if (h.notification_time && isWithinWindow(h.notification_time, parseInt(HH, 10), parseInt(MM, 10), 10)) {
        customDue.push({ id: d.id, ...h });
      }
    });

    // 2) Default schedule at configured time (hearing_date == target && no notification_time)
    const defaultDue = [];
    if (withinDefaultTime) {
      const targetSnap = await getDocs(query(collection(db, 'hearings'), where('hearing_date', '==', targetDateStr)));
      targetSnap.forEach((d) => {
        const h = d.data();
        if (!h.notification_time) {
          defaultDue.push({ id: d.id, ...h });
        }
      });
    }

    const dueHearings = [...customDue, ...defaultDue];
    if (dueHearings.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, reason: 'no-due-hearings' });
    }

    // Group by user (via cases/{id}.user_id)
    const userIdToHearings = new Map();
    for (const h of dueHearings) {
      const caseId = h.case_id;
      if (!caseId) continue;
      const caseSnap = await getDoc(doc(db, 'cases', caseId));
      if (!caseSnap.exists()) continue;
      const c = caseSnap.data();
      const uid = c.user_id;
      if (!uid) continue;
      const item = {
        case_id: caseId,
        case_number: c.case_number || '',
        client_name: c.client_name || '',
        court_name: c.court_name || '',
        date: h.hearing_date,
        notes: h.notes || '',
        next_stage: h.next_stage || '',
      };
      const arr = userIdToHearings.get(uid) || [];
      arr.push(item);
      userIdToHearings.set(uid, arr);
    }

    const brandName = process.env.NOTIFY_BRAND_NAME || 'Case Manager';
    const logoUrl = process.env.NOTIFY_LOGO_URL || '';
    const supportEmail = process.env.NOTIFY_SUPPORT_EMAIL || process.env.NOTIFY_FROM_EMAIL || '';
    const appUrl = process.env.NOTIFY_APP_URL || '';
    const templateId = process.env.NOTIFY_SENDGRID_TEMPLATE_ID || '';

    const disableTracking = String(process.env.NOTIFY_DISABLE_TRACKING || '').toLowerCase() === 'true';
    const bypassList = String(process.env.NOTIFY_BYPASS_LIST || 'true').toLowerCase() === 'true';

    let sent = 0;
    for (const [uid, list] of userIdToHearings.entries()) {
      if (!list.length) continue;
      // get user's email from users/{uid}
      const userSnap = await getDoc(doc(db, 'users', uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      const email = userData?.email || '';
      const greetingName = userData?.name || '';
      if (!email) continue;

      // Subject: include date if all items share same date
      const uniqueDates = Array.from(new Set(list.map(l => l.date)));
      const datePart = uniqueDates.length === 1 ? ` — ${formatIndianDate(uniqueDates[0])}` : '';
      const subject = `Hearing Reminder${datePart}`;

      const templateOpts = { brandName, logoUrl, supportEmail, greetingName, appUrl };
      const html = buildEmailHtml(list, templateOpts);
      const text = buildEmailText(list, templateOpts);

      // Prepare dynamic template data if a SendGrid Dynamic Template is configured
      const dynamicTemplateData = {
        brandName,
        greetingName,
        supportEmail,
        appUrl,
        subject,
        items: list.map((h) => ({
          date: h.date,
          date_formatted: formatIndianDate(h.date),
          client_name: h.client_name || '',
          case_number: h.case_number || '',
          court_name: h.court_name || '',
          next_stage: h.next_stage || '',
          notes: h.notes || '',
          view_url: appUrl && h.case_id ? `${appUrl.replace(/\/$/, '')}/case/${h.case_id}` : '',
        })),
      };
      try {
        const msg = templateId
          ? {
              to: email,
              from: { email: FROM, name: brandName },
              replyTo: supportEmail || undefined,
              subject,
              templateId,
              dynamicTemplateData,
              categories: ['hearing-reminder'],
              mailSettings: { bypassListManagement: { enable: bypassList } },
              trackingSettings: disableTracking ? {
                clickTracking: { enable: false, enableText: false },
                openTracking: { enable: false },
              } : undefined,
            }
          : {
              to: email,
              from: { email: FROM, name: brandName },
              replyTo: supportEmail || undefined,
              subject,
              html,
              text,
              categories: ['hearing-reminder'],
              mailSettings: { bypassListManagement: { enable: bypassList } },
              trackingSettings: disableTracking ? {
                clickTracking: { enable: false, enableText: false },
                openTracking: { enable: false },
              } : undefined,
            };
        await sgMail.send(msg);
        sent += 1;
      } catch (e) {
        // Continue other users even if one fails
      }
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'notify failed' });
  }
}


