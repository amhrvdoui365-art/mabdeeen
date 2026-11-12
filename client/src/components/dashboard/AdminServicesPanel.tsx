import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Image as ImageIcon, Search, Video, Wrench } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPoints, formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi } from '@/services/admin.service';
import { Spinner } from '@/components/ui/Spinner';

export const AdminServicesPanel = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['admin-services', q, status], queryFn: () => adminApi.services({ q: q.trim() || undefined, status: status || undefined, limit: 100 }) });
  const items = query.data?.items ?? [];
  const activeCount = items.filter((item) => item.status === 'active').length;
  const inactiveCount = items.length - activeCount;
  const mutation = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: 'active' | 'inactive'; reason: string }) => adminApi.setServiceStatus(id, next, reason),
    onSuccess: async () => { toast.success('تم تحديث حالة الخدمة وإشعار المستقل'); await queryClient.invalidateQueries({ queryKey: ['admin-services'] }); await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] }); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const copyServiceLink = async (id: string, freelancerId: string) => {
    const url = new URL(`/freelancers/${freelancerId}`, window.location.origin);
    url.searchParams.set('serviceId', id);
    try { await navigator.clipboard.writeText(url.toString()); toast.success('تم نسخ رابط الخدمة'); }
    catch { toast.error('تعذر نسخ الرابط من هذا المتصفح'); }
  };

  return <section className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div><h2 className="text-xl font-black text-slate-900">مراجعة الخدمات</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">ابحث عن أي خدمة، راجع صاحبها ومرفقاتها، وانسخ رابطها أو حدّث حالتها مع توثيق السبب.</p></div>
      {query.data ? <span className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-800">{formatNumber(query.data.pagination.totalItems)} خدمة</span> : null}
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      <button type="button" onClick={() => setStatus('')} className={`rounded-2xl border p-3 text-start transition hover:shadow-sm ${!status ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white'}`}><span className="block text-xs font-bold text-slate-500">كل النتائج الحالية</span><span className="mt-1 block text-xl font-black text-slate-900">{formatNumber(query.data?.pagination.totalItems ?? 0)}</span></button>
      <button type="button" onClick={() => setStatus(status === 'active' ? '' : 'active')} aria-pressed={status === 'active'} className={`rounded-2xl border p-3 text-start transition hover:shadow-sm ${status === 'active' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}><span className="block text-xs font-bold text-emerald-700">خدمات منشورة</span><span className="mt-1 block text-xl font-black text-emerald-800">{formatNumber(activeCount)}</span></button>
      <button type="button" onClick={() => setStatus(status === 'inactive' ? '' : 'inactive')} aria-pressed={status === 'inactive'} className={`rounded-2xl border p-3 text-start transition hover:shadow-sm ${status === 'inactive' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}><span className="block text-xs font-bold text-amber-700">خدمات موقوفة</span><span className="mt-1 block text-xl font-black text-amber-800">{formatNumber(inactiveCount)}</span></button>
    </div>

    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4">
      <label className="relative block"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input className="input w-full pe-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="ابحث بعنوان الخدمة أو التصنيف أو المستقل" aria-label="ابحث في الخدمات"/></label>
      <select className="input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="تصفية الخدمات حسب الحالة"><option value="">كل الحالات</option><option value="active">منشورة</option><option value="inactive">موقوفة</option></select>
      {q || status ? <button type="button" onClick={() => { setQ(''); setStatus(''); }} className="justify-self-start rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 sm:col-span-2">مسح الفلاتر</button> : null}
    </div>

    {query.isPending ? <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><Spinner/></div> : query.isError ? <p className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-800">تعذر تحميل الخدمات. أعد المحاولة.</p> : <>
      <p className="text-xs font-bold text-slate-500">يعرض {formatNumber(items.length)} من النتائج الحالية</p>
      <div className="grid gap-4 xl:grid-cols-2">{items.map((item) => {
        const serviceUrl = `/freelancers/${item.freelancerId}?serviceId=${encodeURIComponent(item.id)}`;
        return <article key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
          <div className="flex items-start justify-between gap-3 p-4 sm:p-5"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Wrench className="size-5"/></span><div className="min-w-0"><h3 className="truncate font-black text-slate-900">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.category} · {formatPoints(item.points)} · {formatDate(item.createdAt)}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'active' ? 'منشورة' : 'موقوفة'}</span></div>
          <div className="mx-4 rounded-2xl bg-slate-50 p-3 sm:mx-5"><p className="text-[11px] font-bold text-slate-500">المستقل صاحب الخدمة</p><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><a href={`/freelancers/${item.freelancerId}`} target="_blank" rel="noreferrer" className="min-w-0 truncate text-sm font-extrabold text-cyan-800 hover:underline">{item.freelancerName}</a><a href={`mailto:${item.freelancerEmail}`} dir="ltr" className="truncate text-xs text-slate-600 hover:underline">{item.freelancerEmail}</a></div></div>
          <div className="flex flex-wrap gap-2 px-4 pt-3 sm:px-5"><a href={serviceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-cyan-800 hover:bg-cyan-100"><ExternalLink className="size-3.5"/>فتح الخدمة</a><button type="button" onClick={() => void copyServiceLink(item.id, item.freelancerId)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><Copy className="size-3.5"/>نسخ الرابط</button></div>
          {item.media?.length ? <details className="mx-4 mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 sm:mx-5"><summary className="cursor-pointer px-3 py-2.5 text-xs font-extrabold text-slate-700">معاينة المرفقات ({item.media.length})</summary><div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-3">{item.media.map((media, index) => <a key={`${media.url}-${index}`} href={media.url} target="_blank" rel="noreferrer" className="group relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">{media.type === 'image' ? <img src={media.url} alt={`معاينة ${item.title}`} loading="lazy" className="size-full object-contain"/> : media.type === 'video' ? <video src={media.url} preload="metadata" className="size-full object-contain"/> : <span className="px-2 text-center text-xs font-bold text-cyan-800">{media.title ?? 'فتح الرابط'}</span>}{media.type === 'image' ? <span className="absolute bottom-1 end-1 rounded-md bg-black/65 p-1 text-white"><ImageIcon className="size-3.5"/></span> : media.type === 'video' ? <span className="absolute bottom-1 end-1 rounded-md bg-black/65 p-1 text-white"><Video className="size-3.5"/></span> : null}</a>)}</div></details> : <p className="px-4 pt-3 text-xs text-slate-400 sm:px-5">لا توجد مرفقات لهذه الخدمة.</p>}
          <details className="group mt-4 border-t border-slate-100"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 sm:px-5"><span>إجراء إداري</span><span className="text-xs font-semibold text-slate-400 group-open:hidden">إظهار</span><span className="hidden text-xs font-semibold text-slate-400 group-open:inline">إخفاء</span></summary><div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5"><label className="block text-xs font-bold text-slate-600">سبب الإجراء<textarea className="input mt-1 min-h-20 w-full resize-y" value={reasons[item.id] ?? ''} onChange={(event) => setReasons((old) => ({ ...old, [item.id]: event.target.value }))} placeholder="اكتب سبباً واضحاً لا يقل عن 5 أحرف"/></label><button className={`mt-3 btn btn-sm ${item.status === 'active' ? 'btn-danger' : 'btn-primary'}`} disabled={(mutation.isPending && mutation.variables?.id === item.id) || (reasons[item.id] ?? '').trim().length < 5} onClick={() => mutation.mutate({ id: item.id, next: item.status === 'active' ? 'inactive' : 'active', reason: reasons[item.id].trim() })}>{item.status === 'active' ? 'إيقاف الخدمة' : <><Check className="size-4"/>إعادة نشر الخدمة</>}</button></div></details>
        </article>;
      })}</div>
      {items.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">لا توجد خدمات تطابق البحث أو الفلاتر.</p> : null}
    </>}
  </section>;
};
