import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function AuthForm({ embedded = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLogin) {
      if (password !== confirmPassword) {
        setLoading(false);
        setError('Passwords do not match.');
        return;
      }
    }

    const { error: authError } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, { name, mobile });

    if (authError) {
      setError(authError.message || 'An error occurred. Please try again.');
    } else if (!isLogin) {
      setError('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setMobile('');
      setIsLogin(true);
    }

    setLoading(false);
  };

  const formCard = (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
      <div className="flex items-center justify-center mb-8">
        <div className="bg-slate-900 p-3 rounded-xl">
          <LogIn className="w-8 h-8 text-white" />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-center text-slate-900 mb-2">
        Case Manager
      </h1>
      <p className="text-center text-slate-600 mb-8">
        {isLogin ? 'Sign in to your account' : 'Create a new account'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!isLogin && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                pattern="^[0-9]{10}$"
                value={mobile}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobile(digits);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                placeholder="+91 98765 43210"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            placeholder="lawyer@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
            placeholder="••••••••"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>
        )}

      <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-slate-600 hover:text-slate-900 text-sm transition"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return formCard;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      {formCard}
    </div>
  );
}

