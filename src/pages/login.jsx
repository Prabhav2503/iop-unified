import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { handleLogin } from '../API/auth';
import { useAuth } from '../context/AuthContext';
import edcLogo from '../assets/edc-logo.png';
import { FOCUS, INPUT_CLS } from '../components/ui';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await handleLogin(username, password);
      if (result.error) {
        setError(result.error);
      } else {
        auth.login(result.data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm animate-rise-in">
        {/* Brand sits above the card at a restrained size — the card is the
            subject, not the logo. */}
        <div className="mb-7 flex flex-col items-center text-center">
          <img
            src={edcLogo}
            alt="eDC IIT Delhi"
            className="h-11 w-auto object-contain brightness-0 invert opacity-90"
          />
          <p className="mt-3 text-micro font-medium uppercase tracking-wide text-ink-faint">
            Internal Operations Portal
          </p>
        </div>

        {/* The card reads as a raised surface on the dark canvas, rather than
            a white outline floating on white. */}
        <div className="rounded-surface border border-line bg-surface p-6 shadow-overlay">
          <h1 className="font-display text-section font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-meta text-ink-faint">
            Use your portal credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-meta font-medium text-ink-muted">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={INPUT_CLS}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-meta font-medium text-ink-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={INPUT_CLS}
              />
            </div>

            {/* Contained, announced, and impossible to miss */}
            {error && (
              <p
                role="alert"
                className="flex animate-rise-in items-start gap-2 rounded-control border border-danger-border bg-danger-soft px-3 py-2 text-meta text-danger-ink"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {/* Matches every other submit in the app: spinner + disabled */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-control bg-accent-500 px-4 py-2.5 text-body font-semibold text-white shadow-glow transition duration-150 ease-exit hover:bg-accent-400 active:scale-[0.99] active:duration-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${FOCUS}`}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-micro text-ink-faint">
          Entrepreneurship Development Cell · IIT Delhi
        </p>
      </div>
    </div>
  );
}
