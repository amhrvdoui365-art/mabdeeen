import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCheck, Clipboard, PackageCheck, Search, ShieldAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPoints, formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi } from '@/services/admin.service';
import { Spinner } from '@/components/ui/Spinner';
import { AdminFilePreviewButton } from './AdminFilePreviewButton';

const STATUS: Record<string, string> = { requested: 'جديد', accepted: 'مقبول', rejected: 'مرفوض', in_progress: 'قيد التنفيذ', delivered: 'بانتظار المراجعة', revision_requested: 'تعديل مطلوب', completed: 'مكتمل', cancelled: 'ملغي' };
const statusTone = (status: string) => status === 'completed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : ['rejected', 'cancelled'].includes(status) ? 'bg-rose-50 text-rose-700 ring-rose-100' : status === 'delivered' ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-cyan-50 text-cyan-800 ring-cyan-100';

export const AdminOrdersPanel = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [openCasesOnly, setOpenCasesOnly] = useState(false);
  const [reason, setReason] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['admin-orders', q, status], queryFn: () => adminApi.orders({ q: q.trim() || undefined, status: status || undefined, limit: 100 }) });
  const orders = query.data?.items ?? [];
  const visibleOrders = openCasesOnly ? orders.filter((order) => order.caseStatus === 'OPEN') : orders;
  const openCasesCount = orders.filter((order) => order.caseStatus === 'OPEN').length;
  const deliveredCount = orders.filter((order) => order.status === 'delivered').length;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] }); };
  const caseMutation = useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => adminApi.openOrderCase(id, text), onSuccess: async () => { toast.success('تم فتح ملف مراجعة للطلب'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const resolveMutation = useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => adminApi.resolveOrderCase(id, text), onSuccess: async () => { toast.success('تم إغلاق ملف المراجعة'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const statusMutation = useMutation({ mutationFn: ({ id, status: next, text }: { id: string; status: 'cancelled' | 'rejected'; text: string }) => adminApi.setOrderStatus(id, next, text), onSuccess: async () => { toast.success('تم تحديث حالة الطلب وإشعار الطرفين'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });

  const copyOrderLink = async (id: string) => {
    const url = new URL('/orders', window.location.origin);
    url.searchParams.set('id', id);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success('تم نسخ رابط الطلب');
    } catch {
      toast.error('تعذر نسخ الرابط من هذا المتصفح');
    }
  };

  return <section className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div><h2 className="text-xl font-black text-slate-900">إدارة الطلبات والنزاعات</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">ابحث عن الطلب، راجع أطرافه وتسليماته، ثم افتح مراجعة أو اتخذ إجراءً موثقاً عند الحاجة.</p></div>
      {query.data ? <span className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-extrabold text-brand-800">{formatNumber(query.data.pagination.totalItems)} طلب</span> : null}
    </header>

    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4">
      <label className="relative block"><Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input className="input w-full pe-9" value={q} onChange={(e) => { setQ(e.target.value); setOpenCasesOnly(false); }} placeholder="ابحث بعنوان الخدمة أو اسم أو بريد أحد الطرفين أو رقم الطلب" aria-label="ابحث في الطلبات"/></label>
      <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setOpenCasesOnly(false); }} aria-label="تصفية الطلبات حسب الحالة"><option value="">كل الحالات</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="button" aria-pressed={!openCasesOnly && !status} onClick={() => { setStatus(''); setOpenCasesOnly(false); }} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${!openCasesOnly && !status ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>كل الطلبات</button>
        <button type="button" aria-pressed={openCasesOnly} onClick={() => { setStatus(''); setOpenCasesOnly((value) => !value); }} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${openCasesOnly ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}><ShieldAlert className="size-3.5"/>مراجعات مفتوحة <span className="rounded-full bg-white/70 px-1.5">{formatNumber(openCasesCount)}</span></button>
        <button type="button" aria-pressed={status === 'delivered'} onClick={() => { setStatus(status === 'delivered' ? '' : 'delivered'); setOpenCasesOnly(false); }} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${status === 'delivered' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>بانتظار مراجعة التسليم <span className="rounded-full bg-white/70 px-1.5">{formatNumber(deliveredCount)}</span></button>
        {q || status || openCasesOnly ? <button type="button" onClick={() => { setQ(''); setStatus(''); setOpenCasesOnly(false); }} className="ms-auto rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">مسح الفلاتر</button> : null}
      </div>
    </div>

    {query.isPending ? <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white"><Spinner/></div> : query.isError ? <p className="rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-800">تعذر تحميل الطلبات. أعد المحاولة.</p> : <>
      <p className="text-xs font-bold text-slate-500">يعرض {formatNumber(visibleOrders.length)} من نتائج البحث الحالية</p>
      <div className="space-y-4">{visibleOrders.map((order) => <article id={`admin-order-${order.id}`} key={order.id} className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-md ${order.caseStatus === 'OPEN' ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><PackageCheck className="size-5"/></span><div className="min-w-0"><h3 className="truncate text-base font-black text-slate-900">{order.serviceId ? <a href={`/freelancers/${order.freelancerId}?serviceId=${encodeURIComponent(order.serviceId)}`} target="_blank" rel="noreferrer" className="decoration-cyan-400 underline-offset-4 hover:underline">{order.serviceTitle}</a> : order.serviceTitle}</h3><div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span dir="ltr" className="rounded-lg bg-slate-100 px-2 py-1 font-mono">#{order.id.slice(0, 8)}</span><span>{formatPoints(order.points)}</span><span>•</span><span>{formatDate(order.createdAt)}</span></div></div></div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${statusTone(order.status)}`}>{STATUS[order.status] ?? order.status}</span><button type="button" onClick={() => void copyOrderLink(order.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"><Clipboard className="size-3.5"/>نسخ الرابط</button></div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {[{ label: 'المشتري', name: order.buyerName, email: order.buyerEmail }, { label: 'المستقل', name: order.freelancerName, email: order.freelancerEmail }].map((person) => <div key={person.label} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"><p className="text-[11px] font-bold text-slate-500">{person.label}</p><p className="mt-1 truncate text-sm font-extrabold text-slate-800">{person.name}</p><a href={`mailto:${person.email}`} dir="ltr" className="mt-1 block truncate text-start text-xs font-semibold text-cyan-800 hover:underline">{person.email}</a></div>)}
        </div>

        {order.caseStatus === 'OPEN' ? <div className="mx-4 mb-3 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800 sm:mx-5"><AlertTriangle className="mt-0.5 size-4 shrink-0"/><p><b>مراجعة مفتوحة:</b> {order.caseReason}</p></div> : null}

        {order.deliveries?.length ? <details className="mx-4 mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 sm:mx-5"><summary className="cursor-pointer px-4 py-3 text-xs font-extrabold text-indigo-900">ملفات وروابط التسليم ({order.deliveries.length})</summary><div className="flex flex-wrap gap-2 border-t border-indigo-100 p-3">{order.deliveries.map((delivery) => delivery.sourceUrl ? <a key={delivery.id} href={delivery.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-white px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-50">{delivery.name} ↗</a> : <AdminFilePreviewButton key={delivery.id} name={delivery.name} mimeType={delivery.mimeType} load={() => adminApi.orderDeliveryFile(delivery.id)}/>)}</div></details> : null}

        <details open={order.caseStatus === 'OPEN' || undefined} className="group border-t border-slate-100">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 sm:px-5"><span className="inline-flex items-center gap-2"><ShieldAlert className="size-4 text-brand-700"/>{order.caseStatus === 'OPEN' ? 'إكمال مراجعة النزاع' : 'إجراءات إدارية'} </span><span className="text-xs font-semibold text-slate-400 group-open:hidden">إظهار</span><span className="hidden text-xs font-semibold text-slate-400 group-open:inline">إخفاء</span></summary>
          <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5"><label className="block min-w-0 text-xs font-bold text-slate-600">سبب الإجراء ونتيجته<textarea className="input mt-1 min-h-20 w-full resize-y" value={reason[order.id] ?? ''} onChange={(e) => setReason((old) => ({ ...old, [order.id]: e.target.value }))} placeholder="اكتب سبباً واضحاً لا يقل عن 5 أحرف"/></label>
            <div className="flex flex-wrap gap-2 sm:justify-end">{order.caseStatus !== 'OPEN' ? <button type="button" disabled={(caseMutation.isPending && caseMutation.variables?.id === order.id) || (reason[order.id] ?? '').trim().length < 5} onClick={() => caseMutation.mutate({ id: order.id, text: reason[order.id].trim() })} className="btn btn-secondary btn-sm"><ShieldAlert className="size-4"/>فتح مراجعة</button> : <button type="button" disabled={(resolveMutation.isPending && resolveMutation.variables?.id === order.caseId) || (reason[order.id] ?? '').trim().length < 5} onClick={() => resolveMutation.mutate({ id: order.caseId!, text: reason[order.id].trim() })} className="btn btn-primary btn-sm"><CheckCheck className="size-4"/>إغلاق المراجعة</button>}{!['completed', 'cancelled', 'rejected'].includes(order.status) ? <button type="button" disabled={(statusMutation.isPending && statusMutation.variables?.id === order.id) || (reason[order.id] ?? '').trim().length < 5} onClick={() => statusMutation.mutate({ id: order.id, status: 'cancelled', text: reason[order.id].trim() })} className="btn btn-danger btn-sm">إلغاء الطلب</button> : null}</div>
          </div>
        </details>
      </article>)}</div>
      {visibleOrders.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">لا توجد طلبات تطابق هذه الفلاتر.</p> : null}
    </>}
  </section>;
};
