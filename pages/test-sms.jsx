import { useState } from 'react';

export default function TestSmsPage() {
  const [to, setTo] = useState('');
  const [body, setBody] = useState('Hello from Twilio + Next.js!');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setResult(data);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Test SMS (Dev only)</h1>
        <p className="text-sm text-gray-600">
          In development this endpoint is open. In production it requires authentication.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">To (E.164)</label>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="+15555550123"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send SMS'}
          </button>
        </form>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        {result ? (
          <div className="text-sm text-green-700">
            Sent! SID: <span className="font-mono">{result.sid}</span>, status: {result.status}
          </div>
        ) : null}
      </div>
    </div>
  );
}


