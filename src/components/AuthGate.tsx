import { useState, type ReactNode } from 'react';
import { isSupabase, supabase } from '../lib/supabase';
import { useApp } from '../state';
import { Icon } from './Icon';

/**
 * Wraps the app. In demo mode it just renders the app (with a banner). With
 * Supabase configured, it shows a sign-in / sign-up screen until there's a
 * session, then renders the app once data has loaded.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { demo, email, ready } = useApp();

  if (demo) {
    return (
      <>
        <div className="demo-banner">
          Demo mode — data resets on reload. Add your Supabase keys to save everything.
        </div>
        {children}
      </>
    );
  }

  if (!email) return <SignIn />;
  if (!ready) return <Splash label="Loading your logbook…" />;
  return <>{children}</>;
}

function Splash({ label }: { label: string }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Icon name="timeline" size={18} />
          </span>
          Logbook
        </div>
        <p className="hint">{label}</p>
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [emailValue, setEmailValue] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: emailValue, password });
        if (error) throw error;
        if (!data.session) setMsg('Check your email to confirm your account, then sign in.');
      }
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="brand-mark">
            <Icon name="timeline" size={18} />
          </span>
          Logbook
        </div>
        <h1 style={{ fontSize: '1.3rem' }}>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pw">
            Password
          </label>
          <input
            id="pw"
            className="input"
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <p className="auth-err">{err}</p>}
        {msg && <p className="hint">{msg}</p>}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
          {busy ? 'Working…' : mode === 'in' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setErr(null);
            setMsg(null);
          }}
        >
          {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

export function SignOutButton() {
  if (!isSupabase || !supabase) return null;
  return (
    <button className="btn ghost small" onClick={() => supabase!.auth.signOut()}>
      <Icon name="close" size={16} /> Sign out
    </button>
  );
}
