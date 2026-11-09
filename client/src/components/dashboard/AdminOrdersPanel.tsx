import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCheck, Search, ShieldAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPoints } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi } from '@/services/admin.service';
import { Spinner } from '@/components/ui/Spinner';
import { AdminFilePreviewButton } from './AdminFilePreviewButton';

const STATUS: Record<string, string> = { requested: 'جديد', accepted: 'مقبول', rejected: 'مرفوض', in_progress: 'قيد التنفيذ', delivered: 'بانتظار المراجعة', revision_requested: 'تعديل مطلوب', completed: 'مكتمل', cancelled: 'ملغي' };

export const AdminOrdersPanel = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['admin-orders', q, status], queryFn: () => adminApi.orders({ q: q.trim() || undefined, status: status || undefined, limit: 100 }) });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); await queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] }); };
  const caseMutation = useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => adminApi.openOrderCase(id, text), onSuccess: async () => { toast.success('تم فتح ملف مراجعة للطلب'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const resolveMutation = useMutation({ mutationFn: ({ id, text }: { id: string; text: string }) => adminApi.resolveOrderCase(id, text), onSuccess: async () => { toast.success('تم إغلاق ملف المراجعة'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });
  const statusMutation = useMutation({ mutationFn: ({ id, status: next, text }: { id: string; status: 'cancelled' | 'rejected'; text: string }) => adminApi.setOrderStatus(id, next, text), onSuccess: async () => { toast.success('تم تحديث حالة الطلب وإشعار الطرفين'); await refresh(); }, onError: (e) => toast.error(getErrorMessage(e)) });

  return <section className="space-y-4" dir="rtl">
    <header><h2 className="text-xl font-black">إدارة الطلبات والنزاعات</h2><p className="mt-1 text-sm text-slate-500">راجع الطلبات، وثّق سبب التدخل، وتابع الحالات المفتوحة. كل إجراء إداري يُسجّل في سجل التدقيق.</p></header>
    <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative"><Search className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بعنوان الخدمة أو اسم/بريد أحد الطرفين أو رقم الطلب"/></label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">كل الحالات</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    {query.isPending ? <div className="grid min-h-40 place-items-center"><Spinner/></div> : query.isError ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">تعذر تحميل الطلبات.</p> : <>
      <p className="text-xs font-bold text-slate-500">{query.data.pagination.totalItems} طلب</p>
      <div className="space-y-3">{query.data.items.map((order) => <article id={`admin-order-${order.id}`} key={order.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${order.caseStatus === 'OPEN' ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-extrabold text-slate-900">{order.serviceId ? <a href={`/freelancers/${order.freelancerId}?serviceId=${order.serviceId}`} target="_blank" rel="noreferrer" className="underline">{order.serviceTitle} ↗</a> : order.serviceTitle}</h3><p className="mt-1 text-xs text-slate-500">#{order.id} · {formatPoints(order.points)} · {formatDate(order.createdAt)}</p></div><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">{STATUS[order.status] ?? order.status}</span></div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p><b>المشتري:</b> {order.buyerName} · <a href={`mailto:${order.buyerEmail}`} className="text-cyan-800 underline">{order.buyerEmail}</a></p><p><b>المستقل:</b> <a href={`/freelancers/${order.freelancerId}`} target="_blank" rel="noreferrer" className="text-cyan-800 underline">{order.freelancerName}</a> · <a href={`mailto:${order.freelancerEmail}`} className="text-cyan-800 underline">{order.freelancerEmail}</a></p></div>
        <a href={`#admin-order-${order.id}`} className="mt-2 inline-flex text-xs font-bold text-cyan-800 underline">رابط الطلب #{order.id.slice(0, 8)} ↗</a>
        {order.deliveries?.length ? <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="mb-2 text-xs font-extrabold text-slate-700">تسليمات الطلب</p><div className="flex flex-wrap gap-2">{order.deliveries.map((delivery) => delivery.sourceUrl ? <a key={delivery.id} href={delivery.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold text-cyan-800">{delivery.name} ↗</a> : <AdminFilePreviewButton key={delivery.id} name={delivery.name} mimeType={delivery.mimeType} load={() => adminApi.orderDeliveryFile(delivery.id)}/>)}</div></div> : null}
        {order.caseStatus === 'OPEN' ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800"><AlertTriangle className="size-4 shrink-0"/>مراجعة مفتوحة: {order.caseReason}</p> : null}
        <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-56 flex-1 text-xs font-bold text-slate-600">سبب/نتيجة الإجراء<textarea className="input mt-1 min-h-16" value={reason[order.id] ?? ''} onChange={(e) => setReason((old) => ({ ...old, [order.id]: e.target.value }))} placeholder="اكتب سببًا واضحًا لا يقل عن 5 أحرف"/></label>
          {order.caseStatus !== 'OPEN' ? <button type="button" disabled={(caseMutation.isPending && caseMutation.variables?.id === order.id) || (reason[order.id] ?? '').trim().length < 5} onClick={() => caseMutation.mutate({ id: order.id, text: reason[order.id].trim() })} className="btn btn-secondary btn-sm"><ShieldAlert className="size-4"/>فتح مراجعة</button> : <button type="button" disabled={resolveMutation.isPending || (reason[order.id] ?? '').trim().length < 5} onClick={() => resolveMutation.mutate({ id: order.caseId!, text: reason[order.id].trim() })} className="btn btn-secondary btn-sm"><CheckCheck className="size-4"/>إغلاق المراجعة</button>}
          {!['completed', 'cancelled', 'rejected'].includes(order.status) ? <button type="button" disabled={statusMutation.isPending || (reason[order.id] ?? '').trim().length < 5} onClick={() => statusMutation.mutate({ id: order.id, status: 'cancelled', text: reason[order.id].trim() })} className="btn btn-danger btn-sm">إلغاء الطلب</button> : null}
        </div>
      </article>)}</div>
      {query.data.items.length === 0 ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">لا توجد طلبات مطابقة.</p> : null}
    </>}
  </section>;
};
