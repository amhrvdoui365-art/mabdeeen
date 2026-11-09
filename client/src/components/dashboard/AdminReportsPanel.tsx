import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Flag,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminReportsParams } from '@/services/admin.service';

export const AdminReportsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'' | 'Pending' | 'Resolved'>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const params: AdminReportsParams = {
    status: status || undefined,
    page,
    limit: 15,
  };

  const reportsQuery = useQuery({
    queryKey: ['admin-reports', params],
    queryFn: () => adminApi.reports(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status: nextStatus,
    }: {
      id: string;
      status: 'Pending' | 'Resolved';
    }) => adminApi.setReportStatus(id, nextStatus),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.status === 'Resolved'
          ? 'تم حل البلاغ بنجاح'
          : 'أُعيد البلاغ لقيد الانتظار',
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث البلاغ')),
  });

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">بلاغات المستخدمين</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            راجع البلاغات الواردة واتخذ الإجراء المناسب بحق الحسابات المخالفة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {reportsQuery.isFetching ? <Spinner className="size-5" /> : null}
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as '' | 'Pending' | 'Resolved')
            }
            className="input w-auto"
            aria-label="فلترة البلاغات"
          >
            <option value="">كل البلاغات</option>
            <option value="Pending">قيد الانتظار</option>
            <option value="Resolved">تم الحل</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {reportsQuery.isError ? (
          <ErrorState
            message="تعذر تحميل البلاغات."
            onRetry={() => void reportsQuery.refetch()}
          />
        ) : reportsQuery.isPending ? (
          <PageLoader label="جارٍ تحميل البلاغات..." />
        ) : reportsQuery.data.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {reportsQuery.data.items.map((report) => {
                const pending = report.status === 'Pending';

                return (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <span
                          className={
                            pending
                              ? 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600'
                              : 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600'
                          }
                        >
                          {pending ? (
                            <ShieldAlert className="size-5" />
                          ) : (
                            <CheckCircle2 className="size-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-900">
                              {report.freelancerName}
                            </h3>
                            <Badge tone={pending ? 'amber' : 'emerald'}>
                              {pending ? 'قيد الانتظار' : 'تم الحل'}
                            </Badge>
                          </div>
                          <p
                            dir="ltr"
                            className="mt-0.5 text-start text-[11px] font-semibold text-slate-400"
                          >
                            {report.freelancerEmail}
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {report.reason}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold text-slate-400">
                            {formatDate(report.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({
                            id: report.id,
                            status: pending ? 'Resolved' : 'Pending',
                          })
                        }
                        disabled={
                          statusMutation.isPending &&
                          statusMutation.variables?.id === report.id
                        }
                        className={
                          pending
                            ? 'btn btn-primary btn-sm shrink-0'
                            : 'btn btn-secondary btn-sm shrink-0'
                        }
                      >
                        {statusMutation.isPending &&
                        statusMutation.variables?.id === report.id ? (
                          <Spinner className="size-4" />
                        ) : pending ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <RotateCcw className="size-4" />
                        )}
                        {pending ? 'تم حل البلاغ' : 'إعادة للانتظار'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5">
              <Pagination
                pagination={reportsQuery.data.pagination}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={Flag}
            title="لا توجد بلاغات"
            description="لا توجد بلاغات مطابقة للفلتر الحالي. عمل رائع!"
            compact
          />
        )}
      </div>
    </section>
  );
};
