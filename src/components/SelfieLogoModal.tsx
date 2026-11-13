import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, X, AlertCircle, Check } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface SelfieLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureSelfie: (dataUrl: string) => void;
}

export function SelfieLogoModal({ isOpen, onClose, onCaptureSelfie }: SelfieLogoModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [cameraError, setCameraError] = useState<{ code: string; message: string; isDenied: boolean } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
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

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setPreviewUrl(null);
      setCameraError(null);
      setIsRequesting(false);
    }
  }, [isOpen, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const startFrontCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError({
        code: 'MediaDevicesUnsupported',
        message: 'Camera access is not available in this browser or context.',
        isDenied: false,
      });
      return;
    }

    stopStream();
    setIsRequesting(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err: any) {
        if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      requestAnimationFrame(async () => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay fallback
          }
        }
      });
    } catch (err: any) {
      stopStream();
      const code = err?.name || 'CameraError';
      const message = err?.message || 'Unable to access front-facing camera.';
      const isDenied =
        code === 'NotAllowedError' ||
        code === 'PermissionDeniedError' ||
        message.toLowerCase().includes('denied') ||
        message.toLowerCase().includes('permission');
      setCameraError({ code, message, isDenied });
    } finally {
      setIsRequesting(false);
    }
  };

  const snapPhoto = () => {
    soundEngine.playFeatureClick();
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 480;
    const h = video.videoHeight || 480;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewUrl(dataUrl);
    soundEngine.playSuccessChime();
    stopStream();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => {
        soundEngine.playFeatureClick();
        stopStream();
        onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden text-slate-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-sm font-black text-slate-950">Update Profile Logo</h3>
            <p className="text-[10px] font-bold text-slate-500">
              Face selfie logo can only be updated once a month
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playFeatureClick();
              stopStream();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative w-52 h-52 mx-auto rounded-full overflow-hidden bg-slate-100 border-4 border-slate-200 flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Selfie preview" className="w-full h-full object-cover" />
            ) : isCameraActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <Camera className="w-10 h-10 text-slate-400" />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-black">{cameraError.code}</div>
                <div>{cameraError.message}</div>
              </div>
            </div>
          )}

          {previewUrl ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  setPreviewUrl(null);
                  startFrontCamera();
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playFeatureClick();
                  soundEngine.playSuccessChime();
                  onCaptureSelfie(previewUrl);
                  onClose();
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3px]" />
                <span>Use Selfie</span>
              </button>
            </div>
          ) : isCameraActive ? (
            <button
              type="button"
              onClick={snapPhoto}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Face Selfie</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playFeatureClick();
                startFrontCamera();
              }}
              disabled={isRequesting}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{cameraError ? 'Retry Camera' : isRequesting ? 'Opening Camera...' : 'Capture Face Selfie'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
