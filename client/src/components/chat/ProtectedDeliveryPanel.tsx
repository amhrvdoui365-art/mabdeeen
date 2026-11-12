import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileImage, FileText, Link2, LockKeyhole, RefreshCw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { deliveryApi, type ProtectedDelivery } from '@/services/rewards.service';
import { getErrorMessage } from '@/services/api';
import { PdfPreview } from '@/components/delivery/PdfPreview';
import { LinkPreview } from '@/components/delivery/LinkPreview';
import { normalizeExternalUrl } from '@/lib/link-preview';
import type { Role } from '@/types';

const STATUS_LABELS: Record<ProtectedDelivery['status'], string> = {
  pending_approval: 'بانتظار موافقة العميل',
  approved: 'تم قبول التسليم',
  rejected: 'مرفوض',
  revision_requested: 'مطلوب تعديل',
};

const Preview = ({ delivery, locked, onOpenImage, viewerRole }: {
  delivery: ProtectedDelivery;
  locked: boolean;
  onOpenImage: (url: string) => void;
  viewerRole?: Role;
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (delivery.sourceUrl) return;
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    setPdf(null);
    setText(null);
    setError(false);
    deliveryApi.file(delivery.previewUrl)
      .then(async (blob) => {
        if (!active) return;
        if (delivery.fileType === 'text/plain') setText(await blob.text());
        else if (delivery.fileType === 'application/pdf') setPdf(blob);
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

  if (delivery.sourceUrl) return <LinkPreview sourceUrl={delivery.sourceUrl} title={delivery.fileName} locked={locked} viewerRole={viewerRole} className="h-60" />;

  if (error) return <div className="grid h-32 place-items-center text-xs text-rose-600">تعذرت معاينة الملف.</div>;
  if (delivery.fileType.startsWith('image/')) return url
    ? <button type="button" onClick={() => onOpenImage(url)} onContextMenu={(event) => event.preventDefault()} className="block h-40 w-full cursor-zoom-in overflow-hidden bg-slate-950" aria-label="تكبير معاينة التسليم"><img src={url} alt="معاينة ملف التسليم" draggable={false} className="size-full select-none object-contain" /></button>
    : <div className="grid h-40 place-items-center text-xs text-slate-400">جارٍ تجهيز المعاينة…</div>;
  if (delivery.fileType === 'application/pdf') return pdf
    ? <PdfPreview blob={pdf} title={delivery.fileName} className="h-[min(68vh,560px)] min-h-80 bg-slate-100" />
    : <div className="grid h-44 place-items-center text-xs text-slate-400">جارٍ تجهيز معاينة PDF…</div>;
  if (delivery.fileType.startsWith('video/')) return url
    ? <video src={url} controls controlsList="nodownload" disablePictureInPicture playsInline onContextMenu={locked ? (event) => event.preventDefault() : undefined} className="h-44 w-full bg-black object-contain" />
    : <div className="grid h-44 place-items-center text-xs text-slate-400">جارٍ تجهيز معاينة الفيديو…</div>;
  if (text !== null) return (
    <section className="bg-slate-50 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 shadow-sm">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><FileText className="size-5" /></span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-800">معاينة الملف النصي</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{text.length.toLocaleString()} حرف</p>
        </div>
      </div>
      <pre dir="auto" onContextMenu={locked ? (event) => event.preventDefault() : undefined} className="max-h-[min(55vh,420px)] min-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-start text-sm leading-7 text-slate-800 shadow-inner whitespace-pre-wrap break-words sm:p-5">{text}</pre>
    </section>
  );
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
  const [linkError, setLinkError] = useState<string | null>(null);
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
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => orderId
        ? items.map((item) => item.id === delivery.id ? delivery : item)
        : items.filter((item) => item.id !== delivery.id));
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setMessage(`مبروك! تم تأكيد المشروع وإضافة ${pointsAwarded} نقطة إلى المستقل.`);
      void queryClient.invalidateQueries({ queryKey: ['rewards'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-vault'] });
    },
    onError: (error) => setMessage(getErrorMessage(error, 'تعذر تأكيد الاستلام.')),
  });

  const linkMutation = useMutation({
    mutationFn: (url: string) => orderId ? deliveryApi.addLink({ orderId, url, title: linkTitle.trim() }) : projectId && clientId ? deliveryApi.addLink({ projectId, clientId, url, title: linkTitle.trim() }) : Promise.reject(new Error('لا يمكن إضافة رابط لهذه المحادثة.')),
    onSuccess: (delivery) => {
      queryClient.setQueryData<ProtectedDelivery[]>(deliveryQueryKey, (items = []) => [delivery, ...items]);
      if (orderId) void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setLinkUrl(''); setLinkTitle(''); setLinkError(null); setLinkFormOpen(false);
      setMessage('تم إرسال رابط المعاينة بأمان.');
    },
    onError: (error) => setLinkError(getErrorMessage(error, 'تعذر إرسال الرابط.')),
  });

  const submitLink = () => {
    const normalized = normalizeExternalUrl(linkUrl);
    if (!normalized) {
      setLinkError('اكتب رابطًا عامًا صحيحًا يبدأ بـ https:// بدون بيانات دخول أو عنوان محلي.');
      return;
    }
    setLinkError(null);
    setMessage(null);
    linkMutation.mutate(normalized);
  };

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
          <button type="button" aria-label="رفع ملف التسليم" title="رفع ملف" onClick={() => fileInput.current?.click()} disabled={uploadMutation.isPending} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white transition hover:bg-indigo-700 disabled:opacity-50"><UploadCloud className="size-4" /><span className="hidden sm:inline">رفع ملف</span></button>
          <button type="button" aria-label="إضافة رابط تسليم" aria-expanded={linkFormOpen} title="إضافة رابط" onClick={() => { setLinkFormOpen((open) => !open); setLinkError(null); }} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-indigo-200 px-3 text-xs font-extrabold text-indigo-700"><Link2 className="size-4" /><span className="hidden sm:inline">إضافة رابط</span></button>
        </> : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {linkFormOpen ? <form className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3" onSubmit={(event) => { event.preventDefault(); submitLink(); }}>
          <input required maxLength={140} value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="اسم التسليم" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
          <input required type="text" inputMode="url" dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={2048} value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); if (linkError) setLinkError(null); }} placeholder="https://youtu.be/… أو https://drive.google.com/…" aria-invalid={Boolean(linkError)} aria-describedby="delivery-link-hint" className={`w-full rounded-lg border bg-white px-3 py-2 text-xs ${linkError ? 'border-rose-300' : 'border-slate-200'}`} />
          <p id="delivery-link-hint" className="text-[10px] leading-4 text-slate-500">يدعم YouTube وVimeo وGoogle Drive وإصدارات Docs المنشورة والمواقع وروابط الفيديو المباشرة. المواقع التي تمنع التضمين تظهر كبطاقة توضيحية داخل المنصة.</p>
          {linkError ? <p role="alert" className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-semibold leading-4 text-rose-700">{linkError}</p> : null}
          <button disabled={linkMutation.isPending} className="min-h-9 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-50">إرسال رابط للمعاينة</button>
        </form> : null}
        {linkFormOpen && isFreelancer ? <div className="rounded-xl border border-indigo-100 bg-white/70 p-2.5 text-[10px] leading-4 text-slate-600 shadow-sm backdrop-blur">
          <p className="mb-1 flex items-center gap-1 font-extrabold text-indigo-900"><ShieldCheck className="size-3.5" />قبل إرسال الرابط للمشتري</p>
          <p>تأكد أن الموقع وملفاته عامة ويسمح بالتضمين عبر إعدادات <span dir="ltr">X-Frame-Options / CSP frame-ancestors</span>. المواقع المحمية بتسجيل دخول أو التي تمنع التضمين ستظهر للعميل كبطاقة توضيحية داخل المنصة.</p>
        </div> : null}
        {!projectId && !orderId ? <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">اربط التسليم بطلب محدد لعرض الملفات وإرسالها بأمان.</p> : null}
        {deliveriesQuery.isPending && (projectId || orderId) ? <p className="py-5 text-center text-xs text-slate-400">جارٍ تحميل التسليمات…</p> : null}
        {deliveriesQuery.isError ? <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">تعذر تحميل تسليمات المشروع.</p> : null}
        {(projectId || orderId) && !deliveriesQuery.isPending && items.length === 0 ? <div className="py-4 text-center"><FileImage className="mx-auto size-8 text-indigo-300" /><p className="mt-2 text-xs font-bold text-slate-600">لا توجد ملفات تسليم بعد</p><p className="mt-1 text-[10px] leading-5 text-slate-400">سيظهر هنا الملف بعد أن يرسله المستقل.</p></div> : null}
        {items.map((item) => {
          const locked = item.isLocked;
          const isClient = role === 'Buyer' && item.clientId === clientId;
          return <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 p-2.5">
              {locked ? <LockKeyhole className="size-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800" title={item.fileName}>{item.fileName}</p><p className="mt-0.5 text-[10px] text-slate-500">{STATUS_LABELS[item.status]} · {item.sourceUrl ? 'رابط خارجي' : `${(item.fileSize / 1024 / 1024).toFixed(1)} MB`}</p></div>
              {item.sourceUrl ? <Link2 className="size-4 shrink-0 text-indigo-500" /> : <FileText className="size-4 shrink-0 text-slate-400" />}
            </div>
            <div className="relative overflow-hidden border-y border-slate-100">
              <Preview delivery={item} locked={locked} viewerRole={role} onOpenImage={(url) => setImagePreview({ url, name: item.fileName })} />{orderId ? <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden"><span className="-rotate-12 rounded-full border border-white/30 bg-slate-950/35 px-4 py-2 text-center text-[10px] font-black tracking-wide text-white/75 shadow-lg">معاينة خاصة · طلب {orderId.slice(0, 8)}</span></div> : null}
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
