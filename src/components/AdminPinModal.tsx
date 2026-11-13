import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { soundEngine } from '../utils/audio';

const MAIN_ADMIN_PIN = '10191';

interface AdminPinModalProps {
  isOpen: boolean;
  email: string;
  isEmailVerified: boolean;
  onVerified: () => Promise<void> | void;
  onSignOut: () => void;
}

export function AdminPinModal({
  isOpen,
  email,
  isEmailVerified,
  onVerified,
  onSignOut,
}: AdminPinModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '']);
      setErrorMsg(null);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pinValue = digits.join('');

  const verifyPinCode = async (code: string) => {
    if (isSubmitting) return;
    if (code.length < 5) {
      setErrorMsg('Please enter all 5 PIN digits.');
      return;
    }
    if (code !== MAIN_ADMIN_PIN) {
      soundEngine.playFeatureClick();
      setErrorMsg('Invalid 5-digit PIN code. Please try again.');
      setDigits(['', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      soundEngine.playSuccessChime();
      await onVerified();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to activate Main Admin Tenant subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    setErrorMsg(null);

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Handle multi-digit paste or autofill
    if (cleaned.length > 1) {
      const next = ['', '', '', '', ''];
      for (let i = 0; i < 5; i++) {
        next[i] = cleaned[i] || '';
      }
      setDigits(next);
      const focusIdx = Math.min(4, cleaned.length - 1);
      inputRefs.current[focusIdx]?.focus();
      if (cleaned.length >= 5) {
        void verifyPinCode(next.join(''));
      }
      return;
    }

    const next = [...digits];
    next[index] = cleaned.slice(-1);
    setDigits(next);

    if (index < 4) {
      inputRefs.current[index + 1]?.focus();
    } else {
      const completed = next.join('');
      if (completed.length === 5) {
        void verifyPinCode(completed);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playFeatureClick();
    void verifyPinCode(pinValue);
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-slate-950 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg">
            <KeyRound className="w-7 h-7 text-blue-400" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Main Admin Access</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            Enter 5-Digit Admin PIN
          </h2>
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            Signed in as <strong className="text-slate-900">{email}</strong>. Enter the 5-digit PIN code to activate and approve your Tenant subscription immediately.
          </p>
        </div>

        {!isEmailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] font-semibold text-amber-900 leading-snug">
            Tip: For full live Firestore admin sync, sign in with Google or verify your email link sent to {email}.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={5}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`PIN digit ${idx + 1}`}
                className="w-12 h-14 text-center text-xl font-black text-slate-950 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 transition-all"
              />
            ))}
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || pinValue.length < 5}
            className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isSubmitting ? 'Activating Tenant...' : 'Verify PIN & Activate Tenant'}</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            soundEngine.playFeatureClick();
            onSignOut();
          }}
          className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
