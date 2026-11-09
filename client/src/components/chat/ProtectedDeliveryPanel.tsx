import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileImage, FileText, Link2, LockKeyhole, RefreshCw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deliveryApi, type ProtectedDelivery } from '@/services/rewards.service';
import { getErrorMessage } from '@/services/api';
import type { Role } from '@/types';

const STATUS_LABELS: Record<ProtectedDelivery['status'], string> = {
  pending_approval: 'بانتظار موافقة العميل',
  approved: 'تم قبول التسليم',
  rejected: 'مرفوض',
  revision_requested: 'مطلوب تعديل',
};

const Preview = ({ delivery, locked, onOpenImage }: {
  delivery: ProtectedDelivery;
  locked: boolean;
  onOpenImage: (url: string) => void;
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (delivery.sourceUrl) return;
    let active = true;
    let objectUrl: string | null = null;
    deliveryApi.file(delivery.previewUrl)
      .then(async (blob) => {
        if (!active) return;
        if (delivery.fileType === 'text/plain') setText(await blob.text());
        else {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [delivery.fileType, delivery.previewUrl, delivery.sourceUrl]);

  if (delivery.sourceUrl) {
    let embedUrl = delivery.sourceUrl;
    try {
      const parsed = new URL(delivery.sourceUrl);
      if (delivery.sourceKind === 'youtube') {
        const videoId = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
        embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
      } else if (delivery.sourceKind === 'drive') {
        const fileId = parsed.pathname.match(/\/d\/([^/]+)/)?.[1];
        embedUrl = fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : delivery.sourceUrl;
      }
    } catch { /* The server validates the URL; retain a safe fallback card. */ }
    return <div onContextMenu={(event) => event.preventDefault()} className="relative h-44 overflow-hidden bg-slate-100">
      <iframe src={embedUrl} title={`معاينة ${delivery.fileName}`} sandbox="allow-scripts allow-forms allow-presentation" referrerPolicy="no-referrer" className="size-full border-0" />
    </div>;
  }

  if (error) return <div className="grid h-32 place-items-center text-xs text-rose-600">تعذرت معاينة الملف.</div>;
  if (delivery.fileType.startsWith('image/')) return url
    ? <button type="button" onClick={() => onOpenImage(url)} onContextMenu={(event) => event.preventDefault()} className="block h-40 w-full cursor-zoom-in overflow-hidden bg-slate-950" aria-label="تكبير معاينة التسليم"><img src={url} alt="معاينة ملف التسليم" draggable={false} className="size-full select-none object-contain" /></button>
    : <div className="grid h-40 place-items-center text-xs text-slate-400">جارٍ تجهيز المعاينة…</div>;
  if (delivery.fileType === 'application/pdf') return url
    ? <div onContextMenu={locked ? (event) => event.preventDefault() : undefined} className="h-44 overflow-hidden bg-slate-100"><iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} title={`معاينة ${delivery.fileName}`} className="size-full border-0" /></div>
    : <div className="grid h-44 place-items-center text-xs text-slate-400">جارٍ تجهيز معاينة PDF…</div>;
  if (delivery.fileType.startsWith('video/')) return url
    ? <video src={url} controls controlsList="nodownload" disablePictureInPicture playsInline onContextMenu={locked ? (event) => event.preventDefault() : undefined} className="h-44 w-full bg-black object-contain" />
    : <div className="grid h-44 place-items-center text-xs text-slate-400">جارٍ تجهيز معاينة الفيديو…</div>;
  if (text !== null) return <pre onContextMenu={locked ? (event) => event.preventDefault() : undefined} className="max-h-44 overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-3 text-xs leading-5 text-slate-700">{text}</pre>;
  return <div className="grid h-32 place-items-center text-xs text-slate-400">جارٍ تجهيز المعاينة…</div>;
};

export const ProtectedDeliveryPanel = ({ projectId, clientId, role, orderId, canDeliver = true }: {
  projectId: string | null;
  clientId: string | null;
  role: Role | undefined;
  orderId?: string;
  canDeliver?: boolean;
}) => {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const deliveryQueryKey = ['protected-deliveries', orderId ?? projectId];
  const deliveriesQuery = useQuery({
    queryKey: deliveryQueryKey,
    queryFn: () => deliveryApi.list(projectId ?? undefined, orderId),
    enabled: Boolean(projectId || orderId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => orderId
      ? deliveryApi.upload({ orderId, file })
      : projectId && clientId ? deliveryApi.upload({ projectId, clientId, file })
      : Promise.reject(new Error('لا يمكن رفع التسليم في هذه المحادثة.')),
    onSuccess: (delivery) => {
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => [delivery, ...items]);
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setMessage('تم رفع الملف بأمان، وهو مقفول حتى يراجعه العميل.');
      if (fileInput.current) fileInput.current.value = '';
    },
    onError: (error) => setMessage(getErrorMessage(error, 'تعذر رفع ملف التسليم.')),
  });

  const approveMutation = useMutation({
    mutationFn: deliveryApi.approve,
    onSuccess: ({ delivery, pointsAwarded }) => {
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => items.filter((item) => item.id !== delivery.id));
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setMessage(`مبروك! تم تأكيد المشروع وإضافة ${pointsAwarded} نقطة إلى المستقل.`);
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-vault'] });
    },
    onError: (error) => setMessage(getErrorMessage(error, 'تعذر تأكيد الاستلام.')),
  });

  const linkMutation = useMutation({
    mutationFn: () => orderId ? deliveryApi.addLink({ orderId, url: linkUrl.trim(), title: linkTitle.trim() }) : projectId && clientId ? deliveryApi.addLink({ projectId, clientId, url: linkUrl.trim(), title: linkTitle.trim() }) : Promise.reject(new Error('لا يمكن إضافة رابط لهذه المحادثة.')),
    onSuccess: (delivery) => {
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => [delivery, ...items]);
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setLinkUrl(''); setLinkTitle(''); setLinkFormOpen(false);
      setMessage('تم إرسال رابط المعاينة بأمان.');
    },
    onError: (error) => setMessage(getErrorMessage(error, 'تعذر إرسال الرابط.')),
  });

  const revisionMutation = useMutation({
    mutationFn: deliveryApi.requestRevision,
    onSuccess: (delivery) => {
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => items.map((item) => item.id === delivery.id ? delivery : item));
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setMessage('تم إرسال طلب التعديل إلى المستقل.');
    },
    onError: (error) => setMessage(getErrorMessage(error, 'تعذر إرسال طلب التعديل.')),
  });

  const isFreelancer = role === 'Freelancer';
  const items = deliveriesQuery.data ?? [];

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-indigo-100 bg-white shadow-sm" aria-label="تسليم المشروع النهائي">
      <header className="flex items-center gap-2 border-b border-indigo-50 bg-linear-to-l from-indigo-50/80 to-white px-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold text-slate-900">تسليم المشروع النهائي</h3><p className="text-[10px] text-slate-500">معاينة خاصة وموافقة آمنة</p></div>
        {isFreelancer && canDeliver && (orderId || (projectId && clientId)) ? <>
          <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,video/mp4,video/webm,video/quicktime" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; if (file) { setMessage(null); uploadMutation.mutate(file); } }} />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploadMutation.isPending} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white transition hover:bg-indigo-700 disabled:opacity-50"><UploadCloud className="size-4" /><span className="hidden sm:inline">رفع ملف</span></button>
          <button type="button" onClick={() => setLinkFormOpen((open) => !open)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 px-3 text-xs font-extrabold text-indigo-700"><Link2 className="size-4" /><span className="hidden sm:inline">إضافة رابط</span></button>
        </> : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {linkFormOpen ? <form className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3" onSubmit={(event) => { event.preventDefault(); linkMutation.mutate(); }}>
          <input required maxLength={140} value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="اسم التسليم" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
          <input required type="url" maxLength={2048} value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https:// رابط موقع أو YouTube أو Google Drive" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
          <button disabled={linkMutation.isPending} className="min-h-9 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50">إرسال رابط للمعاينة</button>
        </form> : null}
        {!projectId && !orderId ? <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">اربط التسليم بطلب محدد لعرض الملفات وإرسالها بأمان.</p> : null}
        {deliveriesQuery.isPending && projectId ? <p className="py-5 text-center text-xs text-slate-400">جارٍ تحميل التسليمات…</p> : null}
        {deliveriesQuery.isError ? <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">تعذر تحميل تسليمات المشروع.</p> : null}
        {projectId && !deliveriesQuery.isPending && items.length === 0 ? <div className="py-4 text-center"><FileImage className="mx-auto size-8 text-indigo-300" /><p className="mt-2 text-xs font-bold text-slate-600">لا توجد ملفات تسليم بعد</p><p className="mt-1 text-[10px] leading-5 text-slate-400">سيظهر هنا الملف بعد أن يرسله المستقل.</p></div> : null}
        {items.map((item) => {
          const locked = item.isLocked;
          const isClient = role === 'Buyer' && item.clientId === clientId;
          return <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 p-2.5">
              {locked ? <LockKeyhole className="size-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800" title={item.fileName}>{item.fileName}</p><p className="mt-0.5 text-[10px] text-slate-500">{STATUS_LABELS[item.status]} · {(item.fileSize / 1024 / 1024).toFixed(1)} MB</p></div>
              <FileText className="size-4 shrink-0 text-slate-400" />
            </div>
            <div className="relative overflow-hidden border-y border-slate-100">
              <Preview delivery={item} locked={locked} onOpenImage={(url) => setImagePreview({ url, name: item.fileName })} />{orderId ? <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden"><span className="-rotate-12 rounded-full border border-white/30 bg-slate-950/35 px-4 py-2 text-center text-[10px] font-black tracking-wide text-white/75 shadow-lg">معاينة خاصة · طلب {orderId.slice(0, 8)}</span></div> : null}
            </div>
            {isClient && item.status === 'pending_approval' && locked ? <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
              <button type="button" onClick={() => approveMutation.mutate(item.id)} disabled={approveMutation.isPending} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="size-4" />قبول الاستلام</button>
              <button type="button" onClick={() => revisionMutation.mutate(item.id)} disabled={revisionMutation.isPending} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 text-xs font-extrabold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"><RefreshCw className="size-3.5" />طلب تعديل</button>
            </div> : null}
          </article>;
        })}
        {message ? <p role="status" className="rounded-xl bg-indigo-50 p-2.5 text-xs font-semibold leading-5 text-indigo-800">{message}</p> : null}
      </div>

      {imagePreview ? <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/95 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setImagePreview(null); }} onContextMenu={(event) => event.preventDefault()}><div className="relative flex max-h-full max-w-full flex-col items-center"><button type="button" onClick={() => setImagePreview(null)} aria-label="إغلاق المعاينة" className="absolute -top-2 -end-2 z-10 flex size-11 items-center justify-center rounded-full bg-white/15 text-white"><X className="size-5" /></button><img src={imagePreview.url} alt={imagePreview.name} draggable={false} className="max-h-[88vh] max-w-[94vw] select-none object-contain" /><p className="mt-2 max-w-[90vw] truncate text-xs text-white/80">{imagePreview.name}</p></div></div> : null}
    </section>
  );
};
