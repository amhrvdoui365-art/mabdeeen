import { useEffect, useState } from 'react';
import { ExternalLink, Eye, FileText, LoaderCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/services/api';
import { useToast } from '@/context/ToastContext';

export const AdminFilePreviewButton = ({ name, mimeType, load }: { name: string; mimeType: string; load: () => Promise<Blob> }) => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const show = async () => {
    if (url) { setOpen(true); return; }
    setBusy(true);
    try { setUrl(URL.createObjectURL(await load())); setOpen(true); }
    catch (error) { toast.error(getErrorMessage(error, 'تعذر فتح الملف')); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" onClick={() => void show()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100 disabled:opacity-60">
      {busy ? <LoaderCircle className="size-3.5 animate-spin"/> : mimeType.startsWith('image/') || mimeType.startsWith('video/') ? <Eye className="size-3.5"/> : <FileText className="size-3.5"/>}
      <span className="max-w-44 truncate">{name}</span>
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={name} size="xl">
      <div className="space-y-3" dir="rtl">
        {url && mimeType.startsWith('image/') ? <img src={url} alt={name} className="mx-auto max-h-[70vh] max-w-full rounded-xl object-contain"/> : null}
        {url && mimeType.startsWith('video/') ? <video src={url} controls playsInline className="mx-auto max-h-[70vh] max-w-full rounded-xl"/> : null}
        {url && (mimeType === 'application/pdf' || mimeType.startsWith('text/')) ? <iframe src={url} title={name} className="h-[70vh] w-full rounded-xl border border-slate-200"/> : null}
        {url && !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && mimeType !== 'application/pdf' && !mimeType.startsWith('text/') ? <div className="rounded-xl bg-slate-50 p-8 text-center"><FileText className="mx-auto size-10 text-slate-400"/><p className="mt-3 text-sm font-bold">هذا النوع لا يدعم المعاينة داخل المتصفح.</p></div> : null}
        {url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-cyan-800"><ExternalLink className="size-4"/>فتح الملف في تبويب</a> : null}
      </div>
    </Modal>
  </>;
};
