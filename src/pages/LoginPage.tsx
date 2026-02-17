import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { setSessionUser } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';

interface LoginPageProps {
  user: SessionUser | null;
  onLoggedIn: (user: SessionUser) => void;
}

export function LoginPage({ user, onLoggedIn }: LoginPageProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password.trim()) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('app_authenticate', {
      p_login: login.trim(),
      p_password: password,
    });
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const row = (data as SessionUser[] | null)?.[0] ?? null;
    if (!row) {
      alert('Login ou senha invalidos.');
      return;
    }

    setSessionUser(row);
    onLoggedIn(row);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-2xl font-extrabold">Acesso ao CRM Apogeu</h1>
        <p className="mt-1 text-sm opacity-70">Entre com seu login e senha para continuar.</p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input
            className="input"
            placeholder="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn-primary w-full justify-center" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
