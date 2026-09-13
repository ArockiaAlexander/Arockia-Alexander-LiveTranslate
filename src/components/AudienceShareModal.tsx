import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Globe,
  Radio,
  Smartphone,
  X,
  AlertTriangle,
  HelpCircle,
  Info,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { LANGUAGE_LIST } from '../data/languages';

interface AudienceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conferenceTitle?: string;
  conferenceVenue?: string;
}

const DEFAULT_SHARED_URL = 'https://your-railway-domain.up.railway.app';
const DEFAULT_DEV_URL = 'http://localhost:3000';

export function AudienceShareModal({
  isOpen,
  onClose,
  conferenceTitle = '72nd Annual General Body Meeting',
  conferenceVenue = 'National Council of India, SSVP',
}: AudienceShareModalProps) {
  // Never default to localhost because phones cannot resolve container localhost
  const getSafeInitialUrl = () => {
    let baseUrl = DEFAULT_SHARED_URL;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        if (origin.includes('ais-dev-')) {
          baseUrl = origin.replace('ais-dev-', 'ais-pre-');
        } else if (origin.startsWith('https://')) {
          baseUrl = origin;
        }
      } else {
        baseUrl = origin || DEFAULT_SHARED_URL;
      }
    }
    return baseUrl.endsWith('/audience') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/audience`;
  };

  const [shareUrl, setShareUrl] = useState<string>(getSafeInitialUrl());
  const [urlMode, setUrlMode] = useState<'public' | 'dev' | 'custom'>('public');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isProjectorView, setIsProjectorView] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [qrSize] = useState<number>(320);

  // Switch presets
  const handleSelectPreset = (mode: 'public' | 'dev' | 'custom') => {
    setUrlMode(mode);
    if (mode === 'public') {
      setShareUrl(DEFAULT_SHARED_URL);
    } else if (mode === 'dev') {
      setShareUrl(DEFAULT_DEV_URL);
    }
  };

  // Generate QR Code data URL with highest error correction for stage and camera readability
  useEffect(() => {
    if (!shareUrl) return;

    QRCode.toDataURL(shareUrl, {
      width: isProjectorView ? 460 : qrSize,
      margin: 3,
      color: {
        dark: '#090d16', // Ultra-high contrast slate-950
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H', // High error correction level
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });
  }, [shareUrl, qrSize, isProjectorView]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Conference_Audience_QR_${Date.now()}.png`;
    a.click();
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      {/* Main Card */}
      <div
        className={`w-full bg-white rounded-3xl shadow-2xl border border-slate-200 transition-all overflow-hidden flex flex-col ${
          isProjectorView
            ? 'max-w-5xl my-auto p-6 sm:p-10 bg-slate-950 text-white border-slate-800 ring-4 ring-indigo-500/20'
            : 'max-w-2xl my-auto p-5 sm:p-7 max-h-[92vh] overflow-y-auto'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                  isProjectorView
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-indigo-600 text-white shadow-xs'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>AUDIENCE ACCESS LINK & QR CODE</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isProjectorView
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                <span>Live On-Air</span>
              </span>
            </div>
            <h2
              className={`text-lg sm:text-xl font-black tracking-tight ${
                isProjectorView ? 'text-white' : 'text-slate-900'
              }`}
            >
              Scan to Listen in Your Language
            </h2>
            <p
              className={`text-xs ${
                isProjectorView ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Audience members scan this QR code with their phone cameras to receive real-time audio in their headsets.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Projector / Fullscreen Mode Toggle */}
            <button
              onClick={() => setIsProjectorView((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                isProjectorView
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={isProjectorView ? 'Exit Stage Projector View' : 'Open Stage Projector View'}
            >
              {isProjectorView ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Normal View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Projector View</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isProjectorView
                  ? 'text-slate-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* URL Mode Preset Selector */}
        {!isProjectorView && (
          <div className="pt-3 pb-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
              <span>Target Link Destination:</span>
              <button
                onClick={() => setShowTroubleshooting((prev) => !prev)}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px] font-bold underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Why is my QR code not opening?</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleSelectPreset('public')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  urlMode === 'public'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>Public Shared URL</div>
                <div className={`text-[10px] font-normal ${urlMode === 'public' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  (For Attendees)
                </div>
              </button>

              <button
                onClick={() => handleSelectPreset('dev')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  urlMode === 'dev'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>Dev Preview URL</div>
                <div className={`text-[10px] font-normal ${urlMode === 'dev' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  (Logged-in Owner)
                </div>
              </button>

              <button
                onClick={() => handleSelectPreset('custom')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                  urlMode === 'custom'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div>Custom Domain</div>
                <div className={`text-[10px] font-normal ${urlMode === 'custom' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  (Your Venue URL)
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Troubleshooting & Activation Notice Box */}
        {(!isProjectorView || showTroubleshooting) && (
          <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-950 font-bold">Why did the QR code not open or show a 404?</strong>
                <p className="mt-1 text-amber-900/90 leading-relaxed">
                  In Google AI Studio, public shared URLs (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">ais-pre-...</code>) are <strong>only activated after you click the "Share" button</strong> in the top-right toolbar of Google AI Studio. Before that button is clicked, Google's Cloud Run server returns <span className="font-semibold text-amber-950">404 Not Found</span> to outside devices.
                </p>
              </div>
            </div>

            <div className="pl-6 pt-1 space-y-1 text-[11px] text-amber-800">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>To fix this in 10 seconds:</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                <li>Look at the top-right corner of Google AI Studio and click the <strong>"Share"</strong> button.</li>
                <li>Confirm sharing to deploy the public URL.</li>
                <li>Once shared, scan the QR code below or tap <strong>"Test in New Tab"</strong> to verify it opens on any phone immediately!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Content Body: QR Code Display + Instructions */}
        <div className="py-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* QR Code Canvas Frame */}
          <div className="md:col-span-6 flex flex-col items-center justify-center text-center">
            <div
              className={`p-4 rounded-2xl border transition-all relative ${
                isProjectorView
                  ? 'bg-white text-slate-900 border-white/20 shadow-2xl shadow-indigo-500/10'
                  : 'bg-slate-50 border-slate-200 shadow-sm'
              }`}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Conference Audience QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR Code...
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-slate-700 font-bold text-xs">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Camera Scan • Works on iOS & Android</span>
              </div>
            </div>

            {/* Actions for QR Code: Download & Test */}
            <div className="mt-3.5 flex flex-wrap justify-center gap-2">
              <button
                onClick={handleDownloadQr}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  isProjectorView
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR Image (PNG)</span>
              </button>

              <button
                onClick={handleOpenLink}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isProjectorView
                    ? 'bg-white/10 hover:bg-white/20 text-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Test whether the link opens in a browser tab right now"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test in New Tab</span>
              </button>
            </div>
          </div>

          {/* Right Side: Step-by-Step Instructions & Available Channels */}
          <div className="md:col-span-6 space-y-3.5">
            {/* Conference Details Banner */}
            <div
              className={`p-3 rounded-xl border ${
                isProjectorView
                  ? 'bg-white/5 border-white/10'
                  : 'bg-indigo-50/70 border-indigo-100'
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                Target Conference
              </div>
              <div
                className={`font-black text-sm ${
                  isProjectorView ? 'text-white' : 'text-indigo-950'
                }`}
              >
                {conferenceTitle}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  isProjectorView ? 'text-slate-400' : 'text-indigo-800/80'
                }`}
              >
                Venue: <strong>{conferenceVenue}</strong> • Instant Multi-Channel Broadcast
              </div>
            </div>

            {/* 3 Audience Steps */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audience Quick Instructions:
              </div>

              <div
                className={`p-2 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isProjectorView
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className={isProjectorView ? 'text-white' : 'text-slate-900'}>
                    Scan the QR Code
                  </strong>
                  <p className={isProjectorView ? 'text-slate-400' : 'text-slate-500'}>
                    Point any phone camera to open the live conference translation web app.
                  </p>
                </div>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isProjectorView
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className={isProjectorView ? 'text-white' : 'text-slate-900'}>
                    Plug in Earphones / Headset
                  </strong>
                  <p className={isProjectorView ? 'text-slate-400' : 'text-slate-500'}>
                    Use standard earphones or Bluetooth earbuds for personal audio reception.
                  </p>
                </div>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isProjectorView
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className={isProjectorView ? 'text-white' : 'text-slate-900'}>
                    Select Your Language Channel
                  </strong>
                  <p className={isProjectorView ? 'text-slate-400' : 'text-slate-500'}>
                    Choose Hindi, Tamil, Telugu, Kannada, Malayalam, or English to hear the live speech translated.
                  </p>
                </div>
              </div>
            </div>

            {/* Supported Language Pills */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>6 Simultaneous Channels Available:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {LANGUAGE_LIST.map((lang) => (
                  <span
                    key={lang.code}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      isProjectorView
                        ? 'bg-white/10 text-amber-300 border border-white/10'
                        : 'bg-indigo-50 text-indigo-900 border border-indigo-100'
                    }`}
                  >
                    {lang.name} ({lang.nativeName})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Share Link Direct URL Bar */}
        <div
          className={`p-3.5 rounded-2xl border mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isProjectorView
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="w-full sm:flex-1 overflow-hidden">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Active Link Encoded in QR Code
            </label>
            <input
              type="text"
              value={shareUrl}
              onChange={(e) => {
                setShareUrl(e.target.value);
                setUrlMode('custom');
              }}
              className={`w-full font-mono text-xs px-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isProjectorView
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
