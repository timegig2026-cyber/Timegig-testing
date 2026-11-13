import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Upload,
  FileText,
  Check,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  Trash2,
  ArrowLeft,
  Lock,
  Receipt,
} from 'lucide-react';
import { SubscriptionPlan, UploadedIdDoc, VerificationSubmission } from '../types';
import { soundEngine } from '../utils/audio';

interface VerificationModalProps {
  isOpen: boolean;
  plan: SubscriptionPlan | null;
  existingSubmission: VerificationSubmission | null;
  onClose: () => void;
  onBackToPlans: () => void;
  onSubmitVerification: (submission: VerificationSubmission) => void;
}

interface CameraErrorInfo {
  code: string;
  message: string;
  isDenied: boolean;
}

async function fileToReviewableDataUrl(file: File): Promise<{ dataUrl?: string; error?: string }> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve({ error: `Could not read ${file.name}.` });
      reader.onload = () => {
        const rawUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!rawUrl) {
          resolve({ error: `Could not read ${file.name}.` });
          return;
        }
        const img = new Image();
        img.onerror = () => resolve({ dataUrl: rawUrl.length <= 750000 ? rawUrl : undefined });
        img.onload = () => {
          const maxDim = 1280;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round((img.width || 640) * scale));
          const h = Math.max(1, Math.round((img.height || 480) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: rawUrl.length <= 750000 ? rawUrl : undefined });
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let compressed = canvas.toDataURL('image/jpeg', 0.8);
          if (compressed.length > 720000) {
            compressed = canvas.toDataURL('image/jpeg', 0.6);
          }
          resolve({ dataUrl: compressed });
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ error: `Could not read ${file.name}.` });
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (rawUrl && rawUrl.length <= 750000) {
        resolve({ dataUrl: rawUrl });
      } else {
        resolve({
          error: `${file.name} is larger than 550 KB. Please upload an image screenshot or smaller PDF so reviewers can view it full screen.`,
        });
      }
    };
    reader.readAsDataURL(file);
  });
}

export function VerificationModal({
  isOpen,
  plan,
  existingSubmission,
  onClose,
  onBackToPlans,
  onSubmitVerification,
}: VerificationModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported'>('unsupported');
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [idDocuments, setIdDocuments] = useState<UploadedIdDoc[]>([]);
  const [proofOfPaymentDocuments, setProofOfPaymentDocuments] = useState<UploadedIdDoc[]>([]);
  const [submittedConfirmation, setSubmittedConfirmation] = useState(false);
  const [wasResubmissionOnSubmit, setWasResubmissionOnSubmit] = useState(false);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Reset modal transient states when opened/closed
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setCameraError(null);
      setUploadError(null);
      setIsRequestingCamera(false);
      setSubmittedConfirmation(false);
      setWasResubmissionOnSubmit(false);
      return;
    }

    if (existingSubmission && existingSubmission.status === 'pending_review' && existingSubmission.plan === plan) {
      setSelfieDataUrl(existingSubmission.selfieDataUrl || null);
      setIdDocuments(existingSubmission.idDocuments || []);
      setProofOfPaymentDocuments(existingSubmission.proofOfPaymentDocuments || []);
    } else {
      setSelfieDataUrl(null);
      setIdDocuments([]);
      setProofOfPaymentDocuments([]);
    }
    setUploadError(null);
    setSubmittedConfirmation(false);
    setWasResubmissionOnSubmit(false);
  }, [isOpen, plan, existingSubmission, stopCameraStream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const checkEnvironmentSupport = (): CameraErrorInfo | null => {
    if (typeof window === 'undefined') {
      return {
        code: 'EnvironmentUnsupported',
        message: 'Camera access requires a browser environment.',
        isDenied: false,
      };
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!window.isSecureContext && !isLocalhost) {
      return {
        code: 'InsecureContextError',
        message: 'Camera access requires a secure HTTPS connection.',
        isDenied: false,
      };
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return {
        code: 'MediaDevicesUnsupported',
        message: 'Camera API is unavailable in this browser or blocked by frame policy.',
        isDenied: false,
      };
    }

    return null;
  };

  const requestFrontCamera = useCallback(async () => {
    setCameraError(null);
    const envIssue = checkEnvironmentSupport();
    if (envIssue) {
      setCameraError(envIssue);
      return;
    }

    stopCameraStream();
    setIsRequestingCamera(true);

    try {
      let stream: MediaStream;
      try {
        // Primary front-facing camera request
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (primaryErr: any) {
        // Fallback for Android Chrome / Samsung Internet if constrained mode fails
        if (
          primaryErr?.name === 'OverconstrainedError' ||
          primaryErr?.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw primaryErr;
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setPermissionState('granted');
      setCameraError(null);

      // Attach stream to video element on next frame
      requestAnimationFrame(async () => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play error:', playErr);
          }
        }
      });
    } catch (err: any) {
      stopCameraStream();
      const errName = err?.name || 'CameraError';
      const errMessage = err?.message || 'Unable to access front-facing camera.';
      const isDenied =
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMessage.toLowerCase().includes('permission') ||
        errMessage.toLowerCase().includes('denied');

      if (isDenied) {
        setPermissionState('denied');
      }

      setCameraError({
        code: errName,
        message: errMessage,
        isDenied,
      });
    } finally {
      setIsRequestingCamera(false);
    }
  }, [stopCameraStream]);

  // Monitor camera permissions via Permissions API where supported
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let statusRef: PermissionStatus | null = null;
    let isMounted = true;

    const handlePermissionChange = () => {
      if (!isMounted || !statusRef) return;
      setPermissionState(statusRef.state);
      if (statusRef.state === 'granted' && !selfieDataUrl && !streamRef.current) {
        requestFrontCamera();
      } else if (statusRef.state === 'denied') {
        stopCameraStream();
      }
    };

    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (!isMounted) return;
        statusRef = status;
        setPermissionState(status.state);
        status.addEventListener('change', handlePermissionChange);
      })
      .catch(() => {
        if (isMounted) setPermissionState('unsupported');
      });

    return () => {
      isMounted = false;
      if (statusRef) {
        statusRef.removeEventListener('change', handlePermissionChange);
      }
    };
  }, [isOpen, selfieDataUrl, requestFrontCamera, stopCameraStream]);

  // Refresh camera access when returning to the capture screen ONLY if permission is already granted
  useEffect(() => {
    if (!isOpen) return;

    const handleReturn = () => {
      if (
        document.visibilityState === 'visible' &&
        permissionState === 'granted' &&
        !selfieDataUrl &&
        !streamRef.current &&
        !submittedConfirmation
      ) {
        requestFrontCamera();
      }
    };

    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleReturn);
    };
  }, [isOpen, permissionState, selfieDataUrl, submittedConfirmation, requestFrontCamera]);

  const handleCaptureSelfie = () => {
    soundEngine.playFeatureClick();
    if (!isCameraActive || !videoRef.current || !canvasRef.current) {
      requestFrontCamera();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (width === 0 || height === 0) {
      setCameraError({
        code: 'StreamNotReady',
        message: 'Camera stream is still initializing. Please wait a moment and try again.',
        isDenied: false,
      });
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally to match selfie preview
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSelfieDataUrl(dataUrl);
    soundEngine.playSuccessChime();
    stopCameraStream();
  };

  const handleRetakeSelfie = () => {
    soundEngine.playFeatureClick();
    setSelfieDataUrl(null);
    requestFrontCamera();
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'id_document' | 'proof_of_payment'
  ) => {
    soundEngine.playFeatureClick();
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    e.target.value = '';

    for (const file of selectedFiles) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { dataUrl, error } = await fileToReviewableDataUrl(file);
      if (error) {
        setUploadError(error);
        continue;
      }
      const nextDoc: UploadedIdDoc = {
        id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        previewUrl: dataUrl,
        category,
      };
      if (category === 'id_document') {
        setIdDocuments((prev) => [...prev, nextDoc]);
      } else {
        setProofOfPaymentDocuments((prev) => [...prev, nextDoc]);
      }
    }
  };

  const handleRemoveDoc = (id: string, category: 'id_document' | 'proof_of_payment') => {
    soundEngine.playFeatureClick();
    if (category === 'id_document') {
      setIdDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } else {
      setProofOfPaymentDocuments((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isResubmission = existingSubmission?.status === 'rejected';
  const isAlreadySubmitted = Boolean(
    existingSubmission &&
      (existingSubmission.status === 'pending_review' ||
        existingSubmission.status === 'active')
  );

  const handleSubmit = () => {
    if (
      !plan ||
      !selfieDataUrl ||
      idDocuments.length === 0 ||
      proofOfPaymentDocuments.length === 0 ||
      isAlreadySubmitted
    ) {
      return;
    }
    soundEngine.playFeatureClick();
    soundEngine.playNewSubmissionAlert();
    stopCameraStream();

    setWasResubmissionOnSubmit(isResubmission);
    const submission: VerificationSubmission = {
      plan,
      selfieDataUrl,
      idDocuments,
      proofOfPaymentDocuments,
      submittedAt: Date.now(),
      status: 'pending_review',
    };
    onSubmitVerification(submission);
    setSubmittedConfirmation(true);
  };

  if (!isOpen || !plan) return null;

  const planTitle = plan === 'tenant' ? 'Tenant Subscription (R299,99/mo)' : 'User Subscription (R29,99/mo)';
  const canSubmit =
    Boolean(selfieDataUrl) &&
    idDocuments.length > 0 &&
    proofOfPaymentDocuments.length > 0 &&
    !isAlreadySubmitted;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        soundEngine.playFeatureClick();
        stopCameraStream();
        onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean White Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                stopCameraStream();
                onBackToPlans();
              }}
              aria-label="Back to subscription plans"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-950 truncate">
                Identity Verification
              </h2>
              <p className="text-[11px] font-bold text-blue-600 truncate">{planTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playFeatureClick();
              stopCameraStream();
              onClose();
            }}
            aria-label="Close verification"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 bg-white">
          {submittedConfirmation || isAlreadySubmitted ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-600 shadow-sm">
                {existingSubmission?.status === 'active' ? (
                  <Check className="w-8 h-8 text-emerald-600" />
                ) : isAlreadySubmitted && !submittedConfirmation ? (
                  <Lock className="w-7 h-7" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-950">
                  {submittedConfirmation
                    ? wasResubmissionOnSubmit
                      ? 'Subscription Resubmitted'
                      : 'Verification Submitted'
                    : 'Subscription Already Submitted'}
                </h3>
                <p className="text-xs font-semibold text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {submittedConfirmation
                    ? 'Your updated live selfie, ID documents, and proof of payment have been submitted for review.'
                    : `You have already submitted the ${
                        existingSubmission?.plan === 'tenant' ? 'Tenant' : 'User'
                      } Subscription. You cannot submit another subscription.`}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    Account Status
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-black uppercase">
                    {existingSubmission?.status === 'active'
                      ? 'Active'
                      : 'Unactive • Pending Review'}
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  {existingSubmission?.status === 'active'
                    ? 'Your subscription is approved and active.'
                    : 'Review takes 15 to 25 minutes. You can continue scrolling and exploring the app right now, and your account will remain unactive until approved.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  onClose();
                }}
                className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Continue Browsing App
              </button>
            </div>
          ) : (
            <>
              {isResubmission && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5 text-left">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Previous Submission Rejected — Resubmit Below</span>
                  </div>
                  {existingSubmission?.rejectionReason && (
                    <p className="text-xs font-bold text-rose-800 bg-white border border-rose-200 rounded-xl px-3 py-2">
                      Reason: {existingSubmission.rejectionReason}
                    </p>
                  )}
                  <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
                    Please capture a new live face selfie, upload valid ID document(s), and attach your proof of payment to resubmit for review.
                  </p>
                </div>
              )}

              {/* Step 1: Live Face Selfie */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">
                        Live Face Selfie
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Capture a clear live selfie using your front camera
                      </p>
                    </div>
                  </div>
                  {selfieDataUrl && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3px]" /> Captured
                    </span>
                  )}
                </div>

                {/* Live Camera / Selfie Preview Area */}
                <div className="relative w-full aspect-[4/3] max-h-60 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
                  {selfieDataUrl ? (
                    <img
                      src={selfieDataUrl}
                      alt="Captured live selfie"
                      className="w-full h-full object-cover"
                    />
                  ) : isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-36 h-44 rounded-full border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.22)]" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        {isRequestingCamera
                          ? 'Requesting front camera access...'
                          : 'Tap "Capture Selfie" to open your front camera'}
                      </p>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Error & Troubleshooting Instructions */}
                {cameraError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2 text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs font-black text-rose-900">
                          Camera Access Issue ({cameraError.code})
                        </div>
                        <p className="text-[11px] font-medium text-rose-800 break-words">
                          {cameraError.message}
                        </p>
                      </div>
                    </div>

                    {cameraError.isDenied && (
                      <div className="text-[11px] text-rose-900 bg-white border border-rose-200 rounded-lg p-2.5 space-y-1">
                        <div className="font-black">How to enable camera access:</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-rose-800 font-medium">
                          <li>Tap the lock/settings icon in your browser address bar.</li>
                          <li>Set <strong>Camera</strong> permission to <strong>Allow</strong>.</li>
                          <li>
                            On Android Chrome / Samsung Internet: Site settings &rarr; Camera &rarr; Allow.
                          </li>
                          <li>Return here and tap <strong>Retry Camera</strong> below.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Camera Action Buttons */}
                <div className="flex items-center gap-2">
                  {selfieDataUrl ? (
                    <button
                      type="button"
                      onClick={handleRetakeSelfie}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Live Selfie</span>
                    </button>
                  ) : isCameraActive ? (
                    <button
                      type="button"
                      onClick={handleCaptureSelfie}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Live Selfie</span>
                    </button>
                  ) : cameraError ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playFeatureClick();
                        requestFrontCamera();
                      }}
                      disabled={isRequestingCamera}
                      className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRequestingCamera ? 'animate-spin' : ''}`} />
                      <span>Retry Camera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playFeatureClick();
                        requestFrontCamera();
                      }}
                      disabled={isRequestingCamera}
                      className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isRequestingCamera ? 'Opening Camera...' : 'Capture Selfie'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Step 2: Upload ID Documents */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">
                        Upload ID Documents
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        National ID, Passport, or Driver&apos;s License (Image or PDF)
                      </p>
                    </div>
                  </div>
                  {idDocuments.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3px]" /> {idDocuments.length} Added
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => handleDocumentUpload(e, 'id_document')}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playFeatureClick();
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-3.5 px-4 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-black text-slate-800">
                    {idDocuments.length > 0 ? 'Upload Another ID Document' : 'Select ID Document(s)'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    JPG, PNG, or PDF files supported
                  </span>
                </button>

                {idDocuments.length > 0 && (
                  <div className="space-y-2">
                    {idDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {doc.previewUrl && doc.type.startsWith('image/') ? (
                            <img
                              src={doc.previewUrl}
                              alt={doc.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{doc.name}</div>
                            <div className="text-[10px] font-medium text-slate-500">
                              {formatBytes(doc.size)}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id, 'id_document')}
                          aria-label={`Remove ${doc.name}`}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 3: Upload Proof of Payment */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-white text-[11px] font-black flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">
                        Proof of Payment
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Upload bank transfer slip, EFT receipt, or payment screenshot
                      </p>
                    </div>
                  </div>
                  {proofOfPaymentDocuments.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3px]" /> {proofOfPaymentDocuments.length} Added
                    </span>
                  )}
                </div>

                <input
                  ref={paymentFileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => handleDocumentUpload(e, 'proof_of_payment')}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playFeatureClick();
                    paymentFileInputRef.current?.click();
                  }}
                  className="w-full py-3.5 px-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-black text-slate-800">
                    {proofOfPaymentDocuments.length > 0 ? 'Upload Another Proof of Payment' : 'Select Proof of Payment'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    JPG, PNG, or PDF files supported
                  </span>
                </button>

                {proofOfPaymentDocuments.length > 0 && (
                  <div className="space-y-2">
                    {proofOfPaymentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {doc.previewUrl && doc.type.startsWith('image/') ? (
                            <img
                              src={doc.previewUrl}
                              alt={doc.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
                              <Receipt className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{doc.name}</div>
                            <div className="text-[10px] font-medium text-slate-500">
                              {formatBytes(doc.size)}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id, 'proof_of_payment')}
                          aria-label={`Remove ${doc.name}`}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Review Timeline Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                  <strong>Review takes 15 to 25 minutes.</strong> After submitting, you can still scroll through the app, while your account stays <strong>unactive</strong> until approved.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Submit Button */}
        {!submittedConfirmation && !isAlreadySubmitted && (
          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isResubmission ? 'Resubmit for Review' : 'Submit for Review'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
