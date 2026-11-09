import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils';
import { adminApi } from '@/services/admin.service';

export const AdminAuditPanel = () => {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['admin-audit-logs', page], queryFn: () => adminApi.auditLogs({ page, limit: 30 }) });
  return <section className="card p-5 sm:p-6" dir="rtl"><header className="flex items-center gap-3"><ScrollText className="size-6 text-cyan-700"/><div><h2 className="text-xl font-black">سجل التدقيق الإداري</h2><p className="mt-1 text-sm text-slate-500">الإجراءات الحساسة وأسبابها وتوقيتها.</p></div></header>{query.isPending ? <div className="grid min-h-40 place-items-center"><Spinner/></div> : query.isError ? <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">تعذر تحميل سجل التدقيق.</p> : <><div className="mt-5 space-y-2">{query.data.items.map((item) => <article key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto]"><div><p className="font-bold">{item.action} <span className="font-normal text-slate-500">· {item.subjectType} · {item.subjectId}</span></p><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-1 text-xs text-slate-400">المدير: {item.adminName ?? 'حساب محذوف'}</p></div><time className="text-xs text-slate-500">{formatDate(item.createdAt)}</time></article>)}</div>{query.data.pagination.totalPages > 1 ? <div className="mt-4"><Pagination pagination={query.data.pagination} onPageChange={setPage}/></div> : null}</>}</section>;
};
