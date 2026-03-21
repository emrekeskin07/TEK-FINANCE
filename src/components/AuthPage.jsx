import React, { useState } from 'react';
import { Chrome, Mail, KeyRound, UserCircle2 } from 'lucide-react';
import TrustBadges from './common/TrustBadges';

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
    if (!canSubmit) return;
    onEmailSignUp?.({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });
  };

  const handleSignIn = () => {
    if (!canSubmit) return;
    onEmailSignIn?.({
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-8 sm:py-12">
      {/* Subtle background glow */}
      <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none flex justify-center">
        <div className="w-[800px] h-[400px] opacity-20 bg-blue-500/30 blur-[120px] rounded-full -translate-y-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] rounded-[24px] border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl p-8 sm:p-10">
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-5">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">TEK Finans'a Giriş Yap</h1>
          <p className="mt-2.5 text-sm text-slate-400 leading-relaxed">Verileriniz uçtan uca şifrelenir ve yalnızca sizin cihazınızda çözümlenir.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Ad Soyad (opsiyonel)</label>
            <div className="relative">
              <UserCircle2 className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Emre Yılmaz"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">E-posta</label>
            <div className="relative">
              <Mail className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Şifre</label>
            <div className="relative">
              <KeyRound className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3 relative">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={submitting || !canSubmit}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-3.5 text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.2)] transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            Giriş Yap
          </button>
          
          <button
            type="button"
            onClick={handleSignUp}
            disabled={submitting || !canSubmit}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 py-3.5 text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            Yeni Hesap Oluştur
          </button>

          <div className="relative py-3 flex items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-medium">veya</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 py-3.5 text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <Chrome className="w-4.5 h-4.5" />
            Google ile Devam Et
          </button>
        </div>

        <TrustBadges compact className="mt-8" />
      </div>
    </div>
  );
}
