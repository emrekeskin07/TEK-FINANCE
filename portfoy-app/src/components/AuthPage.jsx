import React, { useState } from 'react';
import { Chrome, Mail, KeyRound, UserCircle2 } from 'lucide-react';

export default function AuthPage({
  onGoogleSignIn,
  onEmailSignUp,
  onEmailSignIn,
  submitting,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  const handleSignUp = () => {
    if (!canSubmit) {
      return;
    }

    onEmailSignUp?.({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });
  };

  const handleSignIn = () => {
    if (!canSubmit) {
      return;
    }

    onEmailSignIn?.({
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.2),transparent_36%),linear-gradient(145deg,#020617,#0b1120_45%,#111827)] flex items-center justify-center px-4 py-10">
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-white/[0.07] backdrop-blur-2xl shadow-[0_35px_120px_rgba(15,23,42,0.55)] p-7 md:p-9">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-cyan-200/80">TEK Finans</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-100">Portföyüne Güvenli Giriş</h1>
          <p className="mt-2 text-sm text-slate-300/85">Verilerin kullanıcı bazlı izole edilir ve yalnızca kendi hesabında görünür.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold tracking-wide text-slate-300">Ad Soyad (opsiyonel)</label>
          <div className="relative">
            <UserCircle2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Örn: Emre Yılmaz"
              className="w-full bg-black/25 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60"
            />
          </div>

          <label className="block text-xs font-semibold tracking-wide text-slate-300 pt-2">E-posta</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              className="w-full bg-black/25 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60"
            />
          </div>

          <label className="block text-xs font-semibold tracking-wide text-slate-300 pt-2">Şifre</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full bg-black/25 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60"
            />
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <Chrome className="w-4 h-4" />
            Google ile Devam Et
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            disabled={submitting || !canSubmit}
            className="w-full rounded-xl border border-emerald-300/35 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            E-posta/Şifre ile Kaydol
          </button>

          <button
            type="button"
            onClick={handleSignIn}
            disabled={submitting || !canSubmit}
            className="w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 py-3 text-sm font-medium transition-colors disabled:opacity-60"
          >
            E-posta/Şifre ile Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}
