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

function buildEmailHtml(hearings) {
  const items = hearings.map(h =>
    `<li><strong>${h.date}</strong> — ${h.client_name || 'Case'} (${h.case_number || h.case_id}) at ${h.court_name || 'court'}${h.notes ? ` — ${h.notes}` : ''}${h.next_stage ? ` — Next Stage: ${h.next_stage}` : ''}</li>`
  ).join('');
  return `
    <div>
      <p>You have the following upcoming hearing(s):</p>
      <ul>${items}</ul>
    </div>
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

    let sent = 0;
    for (const [uid, list] of userIdToHearings.entries()) {
      if (!list.length) continue;
      // get user's email from users/{uid}
      const userSnap = await getDoc(doc(db, 'users', uid));
      const email = userSnap.exists() ? userSnap.data()?.email || '' : '';
      if (!email) continue;
      const html = buildEmailHtml(list);
      try {
        await sgMail.send({
          to: email,
          from: FROM,
          subject: 'Hearing Reminder',
          html,
          text: list.map(l => `${l.date} — ${l.client_name} (${l.case_number})`).join('\n'),
        });
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


