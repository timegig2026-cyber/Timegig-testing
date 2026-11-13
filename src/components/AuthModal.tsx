import React, { useState, useMemo } from 'react';
import {
  X,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  User as UserIcon,
  Wrench,
  Hammer,
  Paintbrush,
  Scissors,
  Ruler,
  HardHat,
  Briefcase,
  PenTool,
  Settings,
  Compass,
  KeyRound,
} from 'lucide-react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  getAdditionalUserInfo,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { soundEngine } from '../utils/audio';

export interface AuthCompletionPayload {
  user: User;
  isNewUser: boolean;
  firstName?: string;
  lastName?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  invitedBy?: string | null;
  onClose: () => void;
  onAuthCompleted?: (payload: AuthCompletionPayload) => void;
}

const TOOL_ICONS = [
  Wrench,
  Hammer,
  Paintbrush,
  Scissors,
  Ruler,
  HardHat,
  Briefcase,
  PenTool,
  Settings,
  Compass,
  KeyRound,
];

interface RandomToolPlacement {
  id: string;
  Icon: React.ElementType;
  topPct: number;
  leftPct: number;
  sizeClass: string;
  colorClass: string;
  animClass: string;
  delaySec: string;
}

function buildRandomToolPlacements(
  rows: number,
  cols: number,
  palette: string[],
  sizes: string[]
): RandomToolPlacement[] {
  const items: RandomToolPlacement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const Icon = TOOL_ICONS[Math.floor(Math.random() * TOOL_ICONS.length)];
      const cellH = 100 / rows;
      const cellW = 100 / cols;
      const topPct = Math.min(92, Math.max(4, r * cellH + Math.random() * (cellH * 0.72)));
      const leftPct = Math.min(92, Math.max(4, c * cellW + Math.random() * (cellW * 0.72)));
      items.push({
        id: `${r}-${c}-${Math.random().toString(36).slice(2, 6)}`,
        Icon,
        topPct,
        leftPct,
        sizeClass: sizes[Math.floor(Math.random() * sizes.length)],
        colorClass: palette[Math.floor(Math.random() * palette.length)],
        animClass: Math.random() > 0.5 ? 'animate-float-tool-a' : 'animate-float-tool-b',
        delaySec: `${(Math.random() * 2.5).toFixed(2)}s`,
      });
    }
  }
  return items;
}

export function AuthModal({ isOpen, invitedBy, onClose, onAuthCompleted }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const backdropTools = useMemo(
    () =>
      isOpen
        ? buildRandomToolPlacements(
            4,
            5,
            ['text-white/15', 'text-blue-400/20', 'text-amber-400/20', 'text-emerald-400/15'],
            ['w-7 h-7', 'w-8 h-8', 'w-9 h-9']
          )
        : [],
    [isOpen]
  );

  const cardTools = useMemo(
    () =>
      isOpen
        ? buildRandomToolPlacements(
            4,
            4,
            ['text-blue-600/12', 'text-slate-900/10', 'text-amber-500/15', 'text-emerald-600/12'],
            ['w-5 h-5', 'w-6 h-6', 'w-7 h-7']
          )
        : [],
    [isOpen]
  );

  if (!isOpen) return null;

  const formatFirebaseAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Switch to Sign In to welcome back into your account.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please check your credentials and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment before trying again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in window was closed before completing. Please try again.';
      case 'auth/popup-blocked':
        return 'Pop-up was blocked by your browser. Allow pop-ups for this site and retry.';
      case 'auth/operation-not-allowed':
      case 'auth/admin-restricted-operation':
        return 'Email/Password login is not enabled yet in Firebase Console (Authentication → Sign-in method → Email/Password → Enable). You can enable it there or continue with Google below.';
      default:
        return err?.message || 'Unable to authenticate. Please try again.';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please enter your name and surname.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (fullName) {
          await updateProfile(cred.user, { displayName: fullName }).catch(() => {});
        }
        sendEmailVerification(cred.user).catch(() => {});
        soundEngine.playSuccessChime();
        onAuthCompleted?.({
          user: cred.user,
          isNewUser: true,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        onClose();
      } else {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        soundEngine.playSuccessChime();
        onAuthCompleted?.({
          user: cred.user,
          isNewUser: false,
        });
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Enter your email above first to receive a password reset link.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMsg(`Password reset email sent to ${trimmedEmail}.`);
    } catch (err: any) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    soundEngine.playFeatureClick();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const isNewUser = Boolean(getAdditionalUserInfo(result)?.isNewUser);
      soundEngine.playSuccessChime();
      onAuthCompleted?.({
        user: result.user,
        isNewUser,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(formatFirebaseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        soundEngine.playFeatureClick();
        onClose();
      }}
    >
      {/* Random Tools Wallpaper Across Backdrop */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none select-none overflow-hidden">
        {backdropTools.map(({ id, Icon, topPct, leftPct, sizeClass, colorClass, animClass, delaySec }) => (
          <Icon
            key={id}
            className={`absolute ${sizeClass} ${colorClass} ${animClass}`}
            style={{ top: `${topPct}%`, left: `${leftPct}%`, animationDelay: delaySec }}
          />
        ))}
      </div>

      <div
        className="relative bg-white border border-slate-200 rounded-3xl w-full max-w-md max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Random Tools Wallpaper Inside Signup/Sign-in Screen */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          {cardTools.map(({ id, Icon, topPct, leftPct, sizeClass, colorClass, animClass, delaySec }) => (
            <Icon
              key={id}
              className={`absolute ${sizeClass} ${colorClass} ${animClass}`}
              style={{ top: `${topPct}%`, left: `${leftPct}%`, animationDelay: delaySec }}
            />
          ))}
        </div>

        {/* Clean White Header */}
        <div className="relative z-10 p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-white/85 backdrop-blur-[2px] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              {mode === 'signup' ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-950">
                {mode === 'signup' ? 'Create TimeGiG Account' : 'Welcome Back'}
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                {mode === 'signup'
                  ? 'Sign up manually or with Google'
                  : 'Sign in to access your TimeGiG account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playFeatureClick();
              onClose();
            }}
            aria-label="Close sign in"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative z-10 p-4 sm:p-5 space-y-4 overflow-y-auto bg-white/75 backdrop-blur-[1px]">
          {/* Toggle Sign In / Sign Up */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setMode('signin');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                setMode('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {invitedBy && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Invited via User Sub code: <strong>{invitedBy}</strong></span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Manual Email & Password Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                    Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                    Surname
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wide mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>
                {isLoading
                  ? mode === 'signup'
                    ? 'Creating Account...'
                    : 'Signing In...'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Google Sign-Up / Sign-In */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleAuth}
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white font-black text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 5c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.39 0 3.4 2.65 1.44 6.53l3.68 2.86C5.98 6.84 8.75 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.92 3.72-8.69z"
              />
              <path
                fill="#FBBC05"
                d="M5.12 14.61A7.01 7.01 0 0 1 4.75 12c0-.91.16-1.79.37-2.61L1.44 6.53A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.44 5.47l3.68-2.86z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.08.72-2.45 1.16-4.23 1.16-3.25 0-6.02-1.84-6.88-4.43l-3.68 2.86C3.4 21.35 7.39 24 12 24z"
              />
            </svg>
            <span>
              {isLoading
                ? 'Connecting...'
                : mode === 'signup'
                ? 'Sign Up with Google'
                : 'Sign In with Google'}
            </span>
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-start gap-2 text-[11px] font-medium text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Secured with Firebase Authentication. You get your own separate, private account — other users cannot see your profile, location, or activities.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
