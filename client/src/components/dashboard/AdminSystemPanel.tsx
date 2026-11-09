import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Database,
  Download,
  RefreshCw,
  Save,
  ServerCog,
  ShieldAlert,
  Siren,
  Timer,
  Users2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/context/ToastContext';
import { formatNumber } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { systemApi } from '@/services/system.service';
import { adminApi } from '@/services/admin.service';

const REFRESH_MS = 5_000;

const formatUptime = (seconds: number): string => {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} س ${minutes} د`;
  }

  return `${minutes} د ${seconds % 60} ث`;
};

const toLocalInputValue = (iso: string | null): string => {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const AdminSystemPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const healthQuery = useQuery({
    queryKey: ['admin-health'],
    queryFn: systemApi.health,
    refetchInterval: autoRefresh ? REFRESH_MS : false,
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: systemApi.settings,
  });

  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [returnsAt, setReturnsAt] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [blockedTerms, setBlockedTerms] = useState('');

  useEffect(() => {
    const settings = settingsQuery.data;

    if (!settings) {
      return;
    }

    setMaintenance(settings.system.maintenanceEnabled);
    setMessage(settings.system.maintenanceMessage);
    setReturnsAt(toLocalInputValue(settings.system.maintenanceReturnsAt));
    setRegistrationOpen(settings.system.registrationOpen);
    setBlockedTerms(settings.blockedTerms.join('، '));
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: systemApi.saveSettings,
    onSuccess: async (system) => {
      toast.success(
        system.maintenanceEnabled
          ? 'وضع الصيانة مفعّل، الزوار سيرون صفحة الصيانة'
          : 'تم حفظ إعدادات النظام',
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-health'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ إعدادات النظام')),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const terms = blockedTerms
      .split(/[,،]/)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    saveMutation.mutate({
      maintenanceEnabled: maintenance,
      maintenanceMessage: message.trim(),
      maintenanceReturnsAt: returnsAt || null,
      registrationOpen,
      blockedTerms: terms,
    });
  };

  if (settingsQuery.isPending || healthQuery.isPending) {
    return <PageLoader label="جارٍ قراءة حالة النظام..." />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorState
        message="تعذر تحميل إعدادات النظام."
        onRetry={() => void settingsQuery.refetch()}
      />
    );
  }

  const metrics = healthQuery.data;
  const degraded = metrics?.status === 'degraded';

  return (
    <>
    <section className="space-y-5">
      <form onSubmit={submit} className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-linear-to-l from-rose-50 via-white to-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Siren className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">أدوات الطوارئ</h2>
              <p className="text-xs font-semibold text-slate-500">
                إيقاف المنصة للجميع، أو تجميد التسجيل، أو توسيع قائمة المحتوى المحظور.
              </p>
            </div>
          </div>
          <Badge tone={maintenance ? 'rose' : 'emerald'}>
            {maintenance ? 'وضع الصيانة مفعّل' : 'المنصة تعمل'}
          </Badge>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Switch
              checked={maintenance}
              onChange={setMaintenance}
              tone="rose"
              label="وضع الصيانة الشامل"
              description="كل الزوار والمستقلون يوجّهون لصفحة الصيانة. الإدارة فقط تستطيع الدخول."
            />
            <Switch
              checked={registrationOpen}
              onChange={setRegistrationOpen}
              label="فتح باب التسجيل"
              description="أوقف التسجيل مؤقتاً إذا لاحظت موجة حسابات وهمية."
            />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="label">رسالة الصيانة</span>
              <textarea
                rows={3}
                maxLength={300}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="input resize-y"
                placeholder="المنصة قيد الصيانة الدورية، سنعود قريباً."
              />
            </label>
            <label className="block">
              <span className="label">موعد العودة المتوقع</span>
              <input
                type="datetime-local"
                value={returnsAt}
                onChange={(event) => setReturnsAt(event.target.value)}
                className="input"
              />
            </label>
          </div>

          <div className="lg:col-span-2">
            <label className="block">
              <span className="label">كلمات محظورة إضافية (افصل بينها بفاصلة)</span>
              <input
                value={blockedTerms}
                onChange={(event) => setBlockedTerms(event.target.value)}
                className="input"
                placeholder="احتيال, بيع حساب, قرصنة"
              />
              <span className="mt-1.5 block text-xs font-semibold text-slate-500">
                تُضاف للكلمات المحظورة الافتراضية، وأي بروفايل يحتوي عليها يوقف فوراً ويُسجَّل بلاغ.
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold text-slate-500">
            التغييرات تسري خلال ثانية واحدة على كل الطلبات.
          </p>
          <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
            {saveMutation.isPending ? <Spinner className="size-4" /> : <Save className="size-4" />}
            حفظ إعدادات النظام
          </button>
        </div>
      </form>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Activity className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">مراقب صحة الخادم</h2>
              <p className="text-xs font-semibold text-slate-500">
                {metrics
                  ? `${metrics.environment} • Node ${metrics.nodeVersion} • مدة التشغيل ${formatUptime(metrics.uptimeSeconds)}`
                  : 'قراءة مباشرة من الخادم'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              label="تحديث تلقائي"
            />
            <button
              type="button"
              onClick={() => void healthQuery.refetch()}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className={healthQuery.isFetching ? 'size-4 animate-spin' : 'size-4'} />
              تحديث
            </button>
          </div>
        </div>

        {healthQuery.isError || !metrics ? (
          <div className="mt-5">
            <ErrorState
              message="تعذر قراءة مؤشرات الخادم."
              onRetry={() => void healthQuery.refetch()}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={degraded ? 'amber' : 'emerald'}>
                {degraded ? 'الأداء متدهور' : 'كل الأنظمة تعمل'}
              </Badge>
              <Badge tone="slate">آخر قراءة: {new Date(metrics.now).toLocaleTimeString('ar-EG')}</Badge>
              {metrics.database.latencyMs < 0 ? <Badge tone="rose">قاعدة البيانات متوقفة</Badge> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Timer}
                label="زمن الاستجابة p95"
                value={`${metrics.latency.p95Ms} م.ث`}
                hint={`متوسط ${metrics.latency.avgMs} • أعلى ${metrics.latency.maxMs}`}
                tone={metrics.latency.p95Ms > 1500 ? 'rose' : 'brand'}
              />
              <StatCard
                icon={ServerCog}
                label="استهلاك الذاكرة RSS"
                value={`${metrics.memory.rssMb} م.ب`}
                hint={`قمة ${metrics.memory.peakRssMb} • كومة ${metrics.memory.heapUsedMb}`}
                tone={metrics.memory.rssMb > 800 ? 'amber' : 'emerald'}
              />
              <StatCard
                icon={ShieldAlert}
                label="الأخطاء خلال النافذة"
                value={formatNumber(metrics.traffic.errors)}
                hint={`5xx ${metrics.traffic.statusCounts.fiveXx} • 4xx ${metrics.traffic.statusCounts.fourXx}`}
                tone={metrics.traffic.errors > 0 ? 'rose' : 'emerald'}
              />
              <StatCard
                icon={Users2}
                label="طلبات النافذة"
                value={formatNumber(metrics.traffic.requests)}
                hint={`${formatNumber(metrics.latency.samples)} عيّنة سرعة`}
                tone="brand"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <Timer className="size-4" />
                  توزيع زمن الاستجابة
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'الوسطي p50', value: metrics.latency.p50Ms },
                    { label: 'p95', value: metrics.latency.p95Ms },
                    { label: 'الأقصى', value: metrics.latency.maxMs },
                    { label: 'تأخير حلقة الأحداث', value: metrics.eventLoop.meanLagMs },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value} م.ث</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <Database className="size-4" />
                  قاعدة البيانات
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'حجم الملف', value: `${metrics.database.sizeMb} م.ب` },
                    { label: 'زمن الاستعلام', value: `${metrics.database.latencyMs} م.ث` },
                    { label: 'المستخدمون', value: formatNumber(metrics.database.users) },
                    { label: 'الجلسات المخزّنة', value: formatNumber(metrics.database.sessions) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                  <ShieldAlert className="size-4" />
                  الحماية والجلسات النشطة
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'عناوين IP المحظورة', value: formatNumber(metrics.security.blockedIps) },
                    { label: 'الجلسات النشطة', value: formatNumber(metrics.security.liveSessions) },
                    { label: 'بلاغات الإشراف المعلّقة', value: formatNumber(metrics.security.pendingFlags) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-500">{row.label}</dt>
                      <dd className="font-extrabold text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-175 text-start">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">المسار</th>
                    <th className="px-4 py-3 text-start">الطلبات</th>
                    <th className="px-4 py-3 text-start">متوسط الزمن</th>
                    <th className="px-4 py-3 text-start">أقصى زمن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.routes.length > 0 ? (
                    metrics.routes.map((route) => (
                      <tr key={`${route.method} ${route.path}`}>
                        <td className="px-4 py-3" dir="ltr">
                          <span className="text-xs font-extrabold text-slate-900">
                            {route.method} {route.path}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {formatNumber(route.count)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {route.avgMs} م.ث
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-500">
                          {route.maxMs} م.ث
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
                        لا توجد طلبات مسجّلة بعد في هذه النافذة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </section>
    <AdminDataExport />
    </>
  );
};

const EXPORTS = [
  ['users', 'المستخدمون'], ['services', 'الخدمات'], ['orders', 'الطلبات'],
  ['points', 'سجل النقاط'], ['articles', 'المقالات'], ['reports', 'البلاغات'],
] as const;

const AdminDataExport = () => {
  const [active, setActive] = useState<string | null>(null);
  const toast = useToast();
  return <section className="card p-5 sm:p-6" dir="rtl"><div className="flex items-center gap-3"><Database className="size-5 text-cyan-700"/><div><h2 className="font-extrabold">تصدير بيانات الإدارة</h2><p className="mt-1 text-xs text-slate-500">نزّل ملفات CSV للاحتفاظ بنسخة عمل من بيانات المنصة.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{EXPORTS.map(([entity, label]) => <button key={entity} type="button" disabled={Boolean(active)} onClick={async () => { setActive(entity); try { await adminApi.exportData(entity); toast.success(`تم تنزيل ملف ${label}`); } catch (error) { toast.error(getErrorMessage(error)); } finally { setActive(null); } }} className="btn btn-secondary btn-sm"><Download className="size-4"/>{active === entity ? 'جارٍ التجهيز...' : `تصدير ${label}`}</button>)}</div></section>;
};
