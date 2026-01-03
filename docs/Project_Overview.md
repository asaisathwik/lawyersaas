# Lawyer SaaS – Project Overview

This project is a simple, production-ready case and hearing management tool for solo lawyers and small practices. It helps track cases, schedule hearings, manage client documents, and automatically send SMS reminders. The app is designed to be easy to use, cloud-hosted, and secure.

## What we built

- **Case management**
  - Create, edit, search, and delete cases
  - Track client details, case numbers, court info, parties, stages, and status (open/closed)
  - Dashboard view with quick stats and fast search

- **Hearings and reminders**
  - Add/edit/delete hearing entries with notes
  - Automatically syncs “Next Hearing” on the case
  - SMS reminders are sent the day before the hearing (time configurable per hearing). If no time is set, reminders default to 6:00 PM the prior day

- **Calendar view**
  - Monthly calendar highlighting dates with upcoming hearings
  - Single-click to open the related case

- **Documents**
  - Secure, authenticated uploads via API (stored on Cloudinary)
  - Inline image preview, one-click download (via a safe proxy route), and deletion
  - Document metadata (name, size, type, uploaded date) stored alongside the case

- **Messaging and notifications**
  - SMS: Twilio integration for ad‑hoc sends (test screen) and automated reminders
  - Push notifications: Firebase Cloud Messaging wiring and service worker (optional)

- **Accounts & profile**
  - Email/password sign‑in and sign‑up (Firebase Auth)
  - Basic profile (name, mobile, email) with edit flow

- **Security**
  - API routes validate Firebase ID tokens in production
  - Reminder processor is open in development, and secret‑protected in production
  - Case ownership checks enforced on document mutations

## How SMS reminders work (high level)

1. Each hearing stores a `reminder_scheduled_ts` (the planned send time).
2. A background job (cron) hits the reminder processor endpoint on a schedule (e.g., every 5 minutes).
3. The processor finds due hearings, composes a short reminder message, fetches the case owner’s mobile number, and sends the SMS using Twilio.
4. The hearing is marked as “sent” to avoid duplicate notifications.

In production, the processor requires a shared secret (header `x-cron-secret` or a `?secret=` query) to prevent unauthorized calls.

## Integrations and configuration

- **Firebase** (Auth, Firestore, optional Storage)
  - Public web config via `NEXT_PUBLIC_*` environment variables
  - Admin SDK on the server with service account or ADC

- **Twilio** (SMS)
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
  - Provide one of: `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER`

- **Cloudinary** (documents)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

- **Cron/automation**
  - `CRON_SECRET` to protect reminder processing in production
  - Local helper script: `npm run reminders:dev`

- **Optional push notifications**
  - `NEXT_PUBLIC_FCM_VAPID_KEY` (client)
  - Firebase Messaging service worker at `public/firebase-messaging-sw.js`

## Data model (simplified)

- `users/{uid}`: profile (email, name, mobile), notification tokens
- `cases/{id}`: client/case details, status, next hearing date, documents[]
- `hearings/{id}`: per‑case hearing entries, notes, `reminder_scheduled_ts`, delivery status

## Key user flows

- Sign up/in → land on Dashboard → add first case
- Open case → add hearing → optional notes + notification time
- Calendar highlights hearing dates; click to open case
- Upload/preview/download/delete case documents (images/PDFs supported)
- Automatic SMS reminder before the hearing

## Important routes and endpoints (high level)

- Pages: `/login`, `/dashboard`, `/calendar`, `/case/[id]`, `/profile`
- APIs:
  - `POST /api/send-sms` – ad‑hoc SMS (dev open; prod requires auth)
  - `GET|POST /api/process-reminders` – scheduled SMS reminders (prod requires secret)
  - `POST /api/upload` – authenticated document upload to Cloudinary
  - `POST /api/delete-document` – authenticated document deletion (Cloudinary + Firestore)
  - `GET /api/download` – safe proxy for document downloads
  - `GET /api/cron` – simple secret‑protected health/stub endpoint

## Local development

1. `npm install`
2. Create `.env.local` with Firebase, Twilio, Cloudinary, and optional `CRON_SECRET`
3. `npm run dev` to start Next.js locally
4. (Optional) `npm run reminders:dev` to simulate the cron processor in development

## Deployment notes

- Add all required environment variables in your hosting provider (e.g., Vercel)
- Configure a cron (e.g., every 5 minutes) to call `/api/process-reminders` with header `x-cron-secret: <CRON_SECRET>`
- Keep Twilio credentials and Cloudinary secrets in environment variables only

## What’s next (ideas)

- Multi‑user firms (roles, shared calendars, team assignments)
- Template‑based SMS and email notifications
- Advanced search and filters, exports, analytics
- Billing/subscriptions for a commercial SaaS offering

---

If you need a quick, non‑technical pitch to share with clients or stakeholders, see below.

> A modern, easy‑to‑use tool for lawyers to manage cases, hearings, documents, and client reminders—all in one place. It saves time, prevents missed dates, and keeps everything organized, with automatic SMS notifications and a simple calendar that highlights what’s next.


