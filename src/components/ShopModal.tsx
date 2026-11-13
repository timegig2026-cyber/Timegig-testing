import React from 'react';
import {
  X,
  ShoppingBag,
  Check,
  TrendingUp,
  UserCircle,
  Sparkles,
  Clock,
  Wrench,
  Hammer,
  Paintbrush,
  Scissors,
  Ruler,
  HardHat,
  Briefcase,
  PenTool,
  Settings,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { AccountStatus, SubscriptionPlan } from '../types';

export type { SubscriptionPlan };

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
  accountStatus: AccountStatus;
  hasSubmittedSubscription: boolean;
  rejectionReason?: string;
  onChoosePlan: (plan: SubscriptionPlan) => void;
}

function FloatingToolsWallpaper({ accentClass }: { accentClass: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none ${accentClass}`}
    >
      <Wrench className="w-7 h-7 absolute top-5 left-4 animate-float-tool-a" />
      <Hammer className="w-6 h-6 absolute top-8 right-5 animate-float-tool-b" />
      <Ruler className="w-6 h-6 absolute top-24 left-6 animate-float-tool-b" style={{ animationDelay: '0.8s' }} />
      <Paintbrush className="w-7 h-7 absolute top-28 right-4 animate-float-tool-a" style={{ animationDelay: '1.2s' }} />
      <HardHat className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float-tool-a" style={{ animationDelay: '0.4s' }} />
      <Scissors className="w-6 h-6 absolute bottom-28 left-4 animate-float-tool-a" style={{ animationDelay: '1.5s' }} />
      <Briefcase className="w-7 h-7 absolute bottom-24 right-6 animate-float-tool-b" style={{ animationDelay: '0.6s' }} />
      <PenTool className="w-6 h-6 absolute bottom-14 left-10 animate-float-tool-b" style={{ animationDelay: '1.9s' }} />
      <Settings className="w-7 h-7 absolute bottom-12 right-10 animate-float-tool-a" style={{ animationDelay: '1.1s' }} />
    </div>
  );
}

export function ShopModal({
  isOpen,
  onClose,
  selectedPlan,
  accountStatus,
  hasSubmittedSubscription,
  rejectionReason,
  onChoosePlan,
}: ShopModalProps) {
  if (!isOpen) return null;

  const isRejected = accountStatus === 'rejected';
  const isLocked = hasSubmittedSubscription && !isRejected;

  const handleChoosePlan = (plan: SubscriptionPlan) => {
    if (isLocked) {
      soundEngine.playFeatureClick();
      return;
    }
    soundEngine.playFeatureClick();
    onChoosePlan(plan);
  };

  const handleClose = () => {
    soundEngine.playFeatureClick();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (White Bar) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                TimeGiG Subscriptions
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {isRejected
                  ? 'Your previous submission was rejected — select a plan to resubmit'
                  : isLocked
                  ? 'Your subscription has already been submitted'
                  : 'Choose a subscription box to verify & submit'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close subscriptions"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Review / Active / Rejected Banner */}
        {(isLocked || isRejected) && (
          <div
            className={`px-4 py-3 text-xs font-black flex items-start justify-center gap-2 ${
              accountStatus === 'active'
                ? 'bg-emerald-500 text-slate-950'
                : isRejected
                ? 'bg-rose-600 text-white'
                : 'bg-amber-400 text-slate-950'
            }`}
          >
            {accountStatus === 'active' ? (
              <Check className="w-4 h-4 shrink-0 stroke-[3px] mt-0.5" />
            ) : isRejected ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5 text-center sm:text-left">
              <div>
                {accountStatus === 'active'
                  ? `${selectedPlan === 'tenant' ? 'Tenant' : 'User'} Subscription Active • You cannot submit another subscription.`
                  : isRejected
                  ? `${selectedPlan === 'tenant' ? 'Tenant' : 'User'} Subscription Rejected — Choose a plan below to resubmit.`
                  : `Subscription Already Submitted (${selectedPlan === 'tenant' ? 'Tenant' : 'User'}) • Review takes 15 to 25 minutes.`}
              </div>
              {isRejected && rejectionReason && (
                <div className="text-[11px] font-bold bg-rose-700/70 border border-rose-300/40 rounded-lg px-2.5 py-1 text-white">
                  Reason: {rejectionReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2 Subscription Boxes */}
        <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
          {/* Subscription Box 1: Tenant Subscription */}
          <div
            onClick={() => handleChoosePlan('tenant')}
            className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 border-2 ${
              isLocked
                ? selectedPlan === 'tenant'
                  ? 'bg-slate-900/95 border-blue-400 shadow-[0_0_28px_rgba(59,130,246,0.28)] cursor-not-allowed'
                  : 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                : 'bg-slate-950/70 border-blue-500/40 hover:border-blue-400 hover:-translate-y-1 shadow-xl cursor-pointer'
            }`}
          >
            <FloatingToolsWallpaper accentClass="text-blue-400/15" />

            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md border border-blue-300 whitespace-nowrap">
              Earn Passive Income
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 mt-1">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/50 flex items-center justify-center text-blue-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="text-center border-b border-slate-800 pb-3 mb-3">
                <h3 className="text-base font-black text-white tracking-tight">Tenant Subscription</h3>
                <div className="text-2xl font-black text-blue-400 mt-1">
                  R299,99<span className="text-xs font-bold text-slate-400 ml-1">/month</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-medium text-center mb-4 leading-relaxed">
                Become a tenant &amp; earn passive monthly income from user subscriptions.
              </p>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Passive income sharing</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Node network profit hub</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live selfie + ID verification</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                handleChoosePlan('tenant');
              }}
              className={`relative z-10 w-full py-2.5 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                isLocked
                  ? selectedPlan === 'tenant' && accountStatus === 'active'
                    ? 'bg-emerald-500 text-slate-950 cursor-not-allowed'
                    : selectedPlan === 'tenant'
                    ? 'bg-amber-400 text-slate-950 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 border border-blue-400/30 cursor-pointer active:scale-95'
              }`}
            >
              {isLocked ? (
                selectedPlan === 'tenant' && accountStatus === 'active' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>Tenant Plan Active</span>
                  </>
                ) : selectedPlan === 'tenant' ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Already Submitted • Pending</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Already Submitted</span>
                  </>
                )
              ) : isRejected ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resubmit &amp; Verify</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Select &amp; Verify</span>
                </>
              )}
            </button>
          </div>

          {/* Subscription Box 2: User Subscription */}
          <div
            onClick={() => handleChoosePlan('user')}
            className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 border-2 ${
              isLocked
                ? selectedPlan === 'user'
                  ? 'bg-slate-900/95 border-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.28)] cursor-not-allowed'
                  : 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                : 'bg-slate-950/70 border-amber-500/40 hover:border-amber-400 hover:-translate-y-1 shadow-xl cursor-pointer'
            }`}
          >
            <FloatingToolsWallpaper accentClass="text-amber-400/15" />

            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md border border-amber-300 whitespace-nowrap">
              Standard Access
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3 mt-1">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-inner">
                  <UserCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="text-center border-b border-slate-800 pb-3 mb-3">
                <h3 className="text-base font-black text-white tracking-tight">User Subscription</h3>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  R29,99<span className="text-xs font-bold text-slate-400 ml-1">/month</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-medium text-center mb-4 leading-relaxed">
                Use the app &amp; navigate as a verified standard resident.
              </p>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Full 2D &amp; 3D Navigation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Connect with GiGs &amp; Seekers</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Live selfie + ID verification</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                handleChoosePlan('user');
              }}
              className={`relative z-10 w-full py-2.5 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 ${
                isLocked
                  ? selectedPlan === 'user' && accountStatus === 'active'
                    ? 'bg-emerald-500 text-slate-950 cursor-not-allowed'
                    : selectedPlan === 'user'
                    ? 'bg-amber-400 text-slate-950 cursor-not-allowed'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 cursor-pointer active:scale-95'
              }`}
            >
              {isLocked ? (
                selectedPlan === 'user' && accountStatus === 'active' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3px]" />
                    <span>User Plan Active</span>
                  </>
                ) : selectedPlan === 'user' ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Already Submitted • Pending</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Already Submitted</span>
                  </>
                )
              ) : isRejected ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resubmit &amp; Verify</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Select &amp; Verify</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
