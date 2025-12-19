import twilio from 'twilio';

let cachedClient = null;

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function getTwilioClient() {
  if (cachedClient) return cachedClient;
  const accountSid = assertEnv('TWILIO_ACCOUNT_SID');
  const authToken = assertEnv('TWILIO_AUTH_TOKEN');
  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

export function getTwilioFromConfig() {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || '';
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  if (!messagingServiceSid && !fromNumber) {
    throw new Error('Provide TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER');
  }
  if (messagingServiceSid) {
    return { messagingServiceSid };
  }
  return { from: fromNumber };
}

export function validatePhoneNumberE164(phone) {
  return typeof phone === 'string' && /^\+\d{7,15}$/.test(phone);
}

// Best-effort normalization. If already E.164, return as-is.
// If 10 digits (common in India), assume +91.
// Otherwise return null to skip sending.
export function normalizePhoneToE164(phone) {
  if (!phone) return null;
  const trimmed = String(phone).replace(/[^\d+]/g, '');
  if (validatePhoneNumberE164(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) {
    return `+91${digits}`;
  }
  return null;
}


