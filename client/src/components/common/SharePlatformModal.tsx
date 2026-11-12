import { Check, Copy, Download, QrCode, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';

interface SharePlatformModalProps {
  open: boolean;
  onClose: () => void;
}

export const SharePlatformModal = ({ open, onClose }: SharePlatformModalProps) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const platformUrl = window.location.origin;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setQrDataUrl('');
    setQrFailed(false);
    QRCode.toDataURL(platformUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0f766e', light: '#ffffff' },
    }).then((value) => {
      if (active) setQrDataUrl(value);
    }).catch(() => {
      if (active) setQrFailed(true);
    });
    return () => { active = false; };
  }, [open, platformUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(platformUrl);
      setCopied(true);
      toast.success('تم نسخ رابط المنصة');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('انسخ رابط المنصة:', platformUrl);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="شارك منصة مبدعين" size="md">
      <div className="space-y-5" dir="rtl">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-center gap-2 text-brand-800"><Share2 className="size-4" /><p className="text-sm font-extrabold">رابط المنصة</p></div>
          <p className="mt-1 text-xs leading-6 text-slate-600">شارك الرابط ليدخل أصدقاؤك إلى مبدعين مباشرة.</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 bg-white p-1.5 ps-3">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-xs font-semibold text-slate-600">{platformUrl}</span>
            <button type="button" onClick={() => void copyLink()} className="btn btn-primary btn-sm shrink-0">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2"><QrCode className="size-4 text-brand-700" /><p className="text-sm font-extrabold text-slate-900">رمز QR لمشاركة المنصة</p></div>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
            <div className="theme-keep-light flex size-40 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
              {qrDataUrl ? <img src={qrDataUrl} alt="رمز QR لفتح منصة مبدعين" className="size-full object-contain" /> : qrFailed ? <p className="px-2 text-center text-[11px] font-semibold text-rose-600">تعذر إنشاء رمز QR</p> : <Spinner className="size-6 text-brand-700" />}
            </div>
            <div className="text-center sm:text-start">
              <p className="text-xs font-semibold leading-6 text-slate-500">امسح الرمز بكاميرا الهاتف لفتح المنصة، أو نزّله وشاركه مطبوعًا.</p>
              {qrDataUrl ? <a href={qrDataUrl} download="mabdeeen-platform-qr.png" className="btn btn-secondary btn-sm mt-3"><Download className="size-4" />تنزيل رمز QR</a> : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
