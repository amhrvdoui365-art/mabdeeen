import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileImage, FileText, FolderOpen, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { deliveryApi, type ProtectedDelivery } from '@/services/rewards.service';

const VaultPreview = ({ item }: { item: ProtectedDelivery }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (item.sourceUrl) return;
    let active = true;
    let objectUrl: string | null = null;
    deliveryApi.file(item.previewUrl).then(async (blob) => {
      if (!active) return;
      if (item.fileType === 'text/plain') setText(await blob.text());
      else { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl); }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.fileType, item.previewUrl, item.sourceUrl]);

  if (failed) return <div className="grid h-52 place-items-center text-sm text-slate-500">تعذرت معاينة الملف.</div>;
  if (item.sourceUrl) {
    let src = item.sourceUrl;
    try {
      const parsed = new URL(src);
      if (item.sourceKind === 'youtube') {
        const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
        src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      } else if (item.sourceKind === 'drive') {
        const id = parsed.pathname.match(/\/d\/([^/]+)/)?.[1];
        if (id) src = `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
      }
    } catch { /* URL validation is enforced by the API. */ }
    return <div className="relative h-64 overflow-hidden bg-slate-100" onContextMenu={(event) => event.preventDefault()}>
      <iframe src={src} title={`معاينة ${item.fileName}`} sandbox="allow-scripts allow-forms allow-presentation" referrerPolicy="no-referrer" className="size-full border-0" />
    </div>;
  }
  if (item.fileType.startsWith('image/')) return blobUrl
    ? <div className="grid h-64 place-items-center bg-slate-950 p-2" onContextMenu={(event) => event.preventDefault()}><img src={blobUrl} alt={item.fileName} draggable={false} className="max-h-full max-w-full select-none object-contain" /></div>
    : <div className="grid h-64 place-items-center text-sm text-slate-400">جارٍ تجهيز المعاينة…</div>;
  if (item.fileType === 'application/pdf') return blobUrl
    ? <iframe src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0`} title={`معاينة ${item.fileName}`} onContextMenu={(event) => event.preventDefault()} className="h-80 w-full border-0 bg-slate-100" />
    : <div className="grid h-80 place-items-center text-sm text-slate-400">جارٍ تجهيز معاينة PDF…</div>;
  if (item.fileType.startsWith('video/')) return blobUrl
    ? <video src={blobUrl} controls controlsList="nodownload noplaybackrate" disablePictureInPicture playsInline onContextMenu={(event) => event.preventDefault()} className="h-72 w-full bg-black object-contain" />
    : <div className="grid h-72 place-items-center text-sm text-slate-400">جارٍ تجهيز معاينة الفيديو…</div>;
  if (text !== null) return <pre onContextMenu={(event) => event.preventDefault()} className="max-h-80 overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-5 text-sm leading-7 text-slate-700">{text}</pre>;
  return <div className="grid h-52 place-items-center text-sm text-slate-400">نوع الملف غير مدعوم للمعاينة.</div>;
};

export const DeliveryVault = () => {
  const vaultQuery = useQuery({ queryKey: ['delivery-vault'], queryFn: deliveryApi.vault });
  const groups = useMemo(() => {
    const grouped = new Map<string, ProtectedDelivery[]>();
    for (const item of vaultQuery.data ?? []) grouped.set(item.serviceTitle ?? 'تسليمات أخرى', [...(grouped.get(item.serviceTitle ?? 'تسليمات أخرى') ?? []), item]);
    return [...grouped.entries()];
  }, [vaultQuery.data]);

  return <section className="space-y-6" aria-label="ملفاتي">
    <header className="rounded-2xl border border-indigo-100 bg-linear-to-l from-indigo-50 to-white p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><ShieldCheck className="size-5" /></span><div><h2 className="text-xl font-extrabold text-slate-900">ملفاتي</h2><p className="mt-1 text-sm text-slate-600">أرشيف تسليماتك السابقة مرتّب حسب الخدمة. المعاينة متاحة دون تنزيل.</p></div></div>
    </header>
    {vaultQuery.isPending ? <p className="py-12 text-center text-sm text-slate-500">جارٍ تحميل الملفات…</p> : null}
    {vaultQuery.isError ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">تعذر تحميل الأرشيف.</p> : null}
    {vaultQuery.isSuccess && groups.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><FolderOpen className="mx-auto size-9 text-slate-400" /><p className="mt-3 font-bold text-slate-700">لا توجد تسليمات محفوظة بعد</p><p className="mt-1 text-sm text-slate-500">ستظهر التسليمات المقبولة هنا تلقائياً.</p></div> : null}
    {groups.map(([service, items]) => <section key={service} className="space-y-3"><h3 className="flex items-center gap-2 text-base font-extrabold text-slate-800"><FolderOpen className="size-4 text-indigo-600" />{service}</h3><div className="grid gap-4 xl:grid-cols-2">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" onContextMenu={(event) => event.preventDefault()}>
      <div className="flex items-center gap-3 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">{item.sourceUrl ? <ExternalLink className="size-5" /> : item.fileType.startsWith('image/') ? <FileImage className="size-5" /> : <FileText className="size-5" />}</span><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-extrabold text-slate-900">{item.fileName}</h4><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('ar-EG')} · {item.status === 'approved' ? 'مقبول' : item.status === 'revision_requested' ? 'مطلوب تعديله' : 'بانتظار المراجعة'}</p></div></div>
      <VaultPreview item={item} />
    </article>)}</div></section>)}
  </section>;
};
