import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Download, Eye, FileText, LoaderCircle, Star } from 'lucide-react';
import { ExternalWebViewLink } from '@/components/ui/ExternalWebViewLink';
import { parentApi, type LinkedChild } from '@/services/parent.service';

const orderStatus: Record<string, string> = {
  requested: 'طلب جديد', accepted: 'تم القبول', rejected: 'تم الاعتذار', in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم وبانتظار المراجعة', revision_requested: 'تعديل مطلوب', completed: 'مكتمل', cancelled: 'ملغي',
};

const deliveryStatus: Record<string, string> = {
  pending_approval: 'بانتظار اعتماد العميل', approved: 'تم الاعتماد', rejected: 'مرفوض', revision_requested: 'تعديل مطلوب',
};

const formatDate = (value: string) => new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

export const ParentChildOrdersPanel = ({ child }: { child: LinkedChild }) => <div className="space-y-4">
  <div className="grid gap-3 sm:grid-cols-3">
    {[
      ['كل الطلبات', child.orders.length, 'bg-cyan-50 text-cyan-900'],
      ['طلبات مكتملة', child.orders.filter((order) => order.status === 'completed').length, 'bg-emerald-50 text-emerald-900'],
      ['طلبات قيد المتابعة', child.orders.filter((order) => ['requested', 'accepted', 'in_progress', 'delivered', 'revision_requested'].includes(order.status)).length, 'bg-amber-50 text-amber-900'],
    ].map(([label, value, color]) => <div key={String(label)} className={`rounded-2xl p-4 ${color}`}><p className="text-xs font-bold">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
  </div>
  {child.orders.length ? child.orders.map((order) => <article key={order.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-black text-slate-900">{order.serviceTitle}</h3><p className="mt-1 text-xs text-slate-500">مع {order.customerName} · {order.price} نقطة</p></div><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-extrabold text-cyan-800">{orderStatus[order.status] ?? order.status}</span></div>
    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{order.brief}</p>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5"/>آخر تحديث {formatDate(order.updatedAt)}</span><span className="inline-flex items-center gap-1.5"><FileText className="size-3.5"/>{order.deliveryCount} تسليم</span>{order.completedAt ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="size-3.5"/>اكتمل {formatDate(order.completedAt)}</span> : null}</div>
  </article>) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">لا توجد طلبات حتى الآن.</div>}
</div>;

export const ParentChildReviewsPanel = ({ child }: { child: LinkedChild }) => <div className="space-y-4">
  <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-l from-amber-50 to-white p-5"><Star className="size-7 fill-amber-400 text-amber-500"/><span className="text-3xl font-black text-slate-900">{Number(child.stats.avgRating).toFixed(1)}</span><span className="text-sm text-slate-600">متوسط تقييم {child.stats.reviewCount} مراجعة</span></div>
  {child.reviews.length ? child.reviews.map((review) => <article key={review.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-extrabold text-slate-900">{review.clientName}</h3><span className="inline-flex items-center gap-1 text-sm font-black text-amber-700"><Star className="size-4 fill-amber-400 text-amber-500"/>{review.rating} / 5</span></div>{review.comment ? <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{review.comment}</p> : <p className="mt-3 text-sm text-slate-400">تم ترك تقييم دون تعليق.</p>}<time className="mt-3 block text-xs text-slate-400">{formatDate(review.createdAt)}</time></article>) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">لا توجد تقييمات بعد.</div>}
</div>;

const ParentDeliveryFile = ({ childId, delivery }: { childId: string; delivery: LinkedChild['deliveries'][number] }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const preview = async () => {
    setBusy(true); setError(false);
    try {
      const blob = await parentApi.childDeliveryFile(childId, delivery.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  const download = async () => {
    setBusy(true); setError(false);
    try {
      const blob = await parentApi.childDeliveryFile(childId, delivery.id, true);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = delivery.fileName; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError(true); }
    finally { setBusy(false); }
  };

  return <article className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4">
    <div className="flex min-w-0 flex-wrap items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><FileText className="size-5"/></span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-extrabold text-slate-900">{delivery.fileName}</h3><p className="mt-1 text-xs text-slate-500">{delivery.serviceTitle} · {deliveryStatus[delivery.status] ?? delivery.status} · {new Intl.NumberFormat('ar-EG').format(Math.ceil(delivery.fileSize / 1024))} كيلوبايت</p></div>{delivery.sourceUrl ? <ExternalWebViewLink href={delivery.sourceUrl} title={delivery.fileName} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-extrabold text-cyan-800"><Eye className="size-4"/>فتح الرابط</ExternalWebViewLink> : <><button type="button" onClick={() => void preview()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-extrabold text-cyan-800 disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin"/> : <Eye className="size-4"/>}معاينة</button>{delivery.isLocked ? <span className="text-[11px] font-bold text-amber-700">التنزيل بعد اعتماد التسليم</span> : <button type="button" onClick={() => void download()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800 disabled:opacity-50"><Download className="size-4"/>تنزيل</button>}</>}</div>
    {error ? <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">تعذر فتح الملف. حدّث الصفحة وحاول مجددًا.</p> : null}
    {previewUrl ? <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950">{delivery.fileType.startsWith('image/') ? <img src={previewUrl} alt={delivery.fileName} className="max-h-[70vh] w-full object-contain"/> : delivery.fileType.startsWith('video/') ? <video src={previewUrl} controls playsInline className="max-h-[70vh] w-full object-contain"/> : delivery.fileType === 'application/pdf' ? <iframe title={delivery.fileName} src={previewUrl} className="h-[70vh] w-full bg-white"/> : <div className="p-4 text-center text-sm text-white">تم تجهيز الملف للمعاينة؛ استخدم زر التنزيل بعد اعتماد التسليم إذا كان نوع الملف لا يدعم العرض داخل المتصفح.</div>}</div> : null}
    <time className="mt-3 block text-[11px] text-slate-400">رُفع في {formatDate(delivery.createdAt)}</time>
  </article>;
};

export const ParentChildDeliveriesPanel = ({ child }: { child: LinkedChild }) => <div className="space-y-3">
  <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">تظهر هنا ملفات وروابط التسليم التي رفعها الابن. يمكن معاينة التسليمات، ويتاح تنزيل الملف بعد اعتماد التسليم.</div>
  {child.deliveries.length ? child.deliveries.map((delivery) => <ParentDeliveryFile key={delivery.id} childId={child.id} delivery={delivery}/>) : <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">لا توجد ملفات تسليم مرفوعة حتى الآن.</div>}
</div>;
