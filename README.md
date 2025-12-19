lawyerSaaSApp

## Twilio SMS Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with:

   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   # One of these is required:
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # or:
   # TWILIO_PHONE_NUMBER=+15555550123

   # Optional: Production-only auth for the reminder processor
   # Set this and configure your cron to pass it via header x-cron-secret or ?secret=
   CRON_SECRET=some-long-random-string
   ```

3. Start dev server and test at `/test-sms`.


## Hearing SMS Reminders

- When you add or edit a hearing, the app stores `reminder_scheduled_ts`:
  - If you set Notification Time, you'll get an SMS the day before at that time.
  - If you leave it blank, you'll get an SMS the day before at 6:00 PM.

- The reminder processor endpoint:
  - `GET /api/process-reminders` (open in development).
  - In production, require `CRON_SECRET` and call with header `x-cron-secret: <CRON_SECRET>` or `?secret=<CRON_SECRET>`.
  - It sends due reminders (based on `reminder_scheduled_ts`) to the account owner’s mobile saved in `users/{uid}.mobile`.

- Local testing:
  - Add a hearing with a date/time that yields a scheduled time in the next minute.
  - Then call:

    ```bash
    curl "http://localhost:3000/api/process-reminders"
    ```

- Production cron:
  - If you deploy on Vercel, add a cron (e.g., every 5 minutes) targeting `/api/process-reminders` with `x-cron-secret` header.
  - Make sure `CRON_SECRET` is set in project environment variables.