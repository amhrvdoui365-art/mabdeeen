import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Bell,
  Coins,
  Eye,
  Flag,
  FileText,
  Headset,
  LayoutDashboard,
  MessageSquareText,
  Newspaper,
  ScrollText,
  ShoppingBag,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Waves,
  Wrench,
  KeyRound,
  Trash2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { CommunityDashboardPanel } from '@/components/dashboard/CommunityDashboardPanel';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatNumber } from '@/lib/utils';
import { adminApi } from '@/services/admin.service';
import { PasswordChangePanel } from '@/components/dashboard/PasswordChangePanel';
import { systemApi } from '@/services/system.service';

const AdminModerationPanel = lazy(() => import('@/components/dashboard/AdminModerationPanel').then((module) => ({ default: module.AdminModerationPanel })));
const AdminNotificationsPanel = lazy(() => import('@/components/dashboard/AdminNotificationsPanel').then((module) => ({ default: module.AdminNotificationsPanel })));
const AdminReportsPanel = lazy(() => import('@/components/dashboard/AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })));
const AdminReviewsPanel = lazy(() => import('@/components/dashboard/AdminReviewsPanel').then((module) => ({ default: module.AdminReviewsPanel })));
const AdminSessionsPanel = lazy(() => import('@/components/dashboard/AdminSessionsPanel').then((module) => ({ default: module.AdminSessionsPanel })));
const AdminSystemPanel = lazy(() => import('@/components/dashboard/AdminSystemPanel').then((module) => ({ default: module.AdminSystemPanel })));
const AdminUsersPanel = lazy(() => import('@/components/dashboard/AdminUsersPanel').then((module) => ({ default: module.AdminUsersPanel })));
const AdminParentVerificationsPanel = lazy(() => import('@/components/dashboard/AdminParentVerificationsPanel').then((module) => ({ default: module.AdminParentVerificationsPanel })));
const AdminSupportPanel = lazy(() => import('@/components/dashboard/AdminSupportPanel').then((module) => ({ default: module.AdminSupportPanel })));
const AdminConversationsPanel = lazy(() => import('@/components/dashboard/AdminConversationsPanel').then((module) => ({ default: module.AdminConversationsPanel })));
const AdminOrdersPanel = lazy(() => import('@/components/dashboard/AdminOrdersPanel').then((module) => ({ default: module.AdminOrdersPanel })));
const AdminServicesPanel = lazy(() => import('@/components/dashboard/AdminServicesPanel').then((module) => ({ default: module.AdminServicesPanel })));
const AdminPointsPanel = lazy(() => import('@/components/dashboard/AdminPointsPanel').then((module) => ({ default: module.AdminPointsPanel })));
const AdminArticlesPanel = lazy(() => import('@/components/dashboard/AdminArticlesPanel').then((module) => ({ default: module.AdminArticlesPanel })));
const AdminAuditPanel = lazy(() => import('@/components/dashboard/AdminAuditPanel').then((module) => ({ default: module.AdminAuditPanel })));
const AdminPlatformWipePanel = lazy(() => import('@/components/dashboard/AdminPlatformWipePanel').then((module) => ({ default: module.AdminPlatformWipePanel })));

const TABS = [
  { id: 'security', label: 'أمان الحساب', icon: KeyRound },
  { id: 'danger-zone', label: 'مسح بيانات المنصة', icon: Trash2 },
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'system', label: 'النظام والطوارئ', icon: Activity },
  { id: 'sessions', label: 'الجلسات والحظر', icon: MonitorSmartphone },
  { id: 'moderation', label: 'فاحص المحتوى', icon: ShieldAlert },
  { id: 'reports', label: 'البلاغات', icon: Flag },
  { id: 'reviews', label: 'التقييمات', icon: MessageSquareText },
  { id: 'notifications', label: 'الإشعارات', icon: Bell },
  { id: 'community', label: 'المجتمع', icon: Newspaper },
  { id: 'parent-verifications', label: 'توثيق أولياء الأمور', icon: UserCheck },
  { id: 'support', label: 'الدعم الفني والرسائل', icon: Headset },
  { id: 'orders', label: 'الطلبات والنزاعات', icon: ShoppingBag },
  { id: 'services', label: 'مراجعة الخدمات', icon: Wrench },
  { id: 'points', label: 'النقاط والمكافآت', icon: Coins },
  { id: 'articles', label: 'المقالات', icon: FileText },
  { id: 'conversations', label: 'مراجعة المحادثات', icon: MessageSquareText },
  { id: 'audit', label: 'سجل التدقيق', icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const AdminDashboardPage = () => {
  const [searchParams] = useSearchParams();
  useDocumentTitle('لوحة الإدارة');

  const [tab, setTab] = useState<TabId>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return TABS.some((item) => item.id === requested) ? requested as TabId : 'overview';
  });

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (TABS.some((item) => item.id === requested)) setTab(requested as TabId);
  }, [searchParams]);

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: () => systemApi.settings(),
    staleTime: 15_000,
  });

  if (statsQuery.isPending) {
    return <PageLoader label="جارٍ تحميل لوحة الإدارة..." />;
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message="تعذر تحميل إحصائيات الإدارة. تأكد من الصلاحيات واتصال الخادم."
          onRetry={() => void statsQuery.refetch()}
        />
      </div>
    );
  }

  const stats = statsQuery.data;
  const maintenanceActive = settingsQuery.data?.system.maintenanceEnabled ?? false;
  const maxSkillCount = Math.max(
    1,
    ...stats.topSkills.map((skill) => skill.freelancers),
  );

  const quickCards = [
    {
      id: 'system' as const,
      icon: Activity,
      title: 'أزرار الطوارئ',
      description: 'وضع الصيانة العام، إغلاق التسجيل، وفحص صحة الخادم لحظة بلحظة.',
      value: maintenanceActive ? 'الصيانة مفعّلة' : 'المنصة تعمل',
      tone: maintenanceActive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
    },
    {
      id: 'sessions' as const,
      icon: MonitorSmartphone,
      title: 'الجلسات وحظر العناوين',
      description: 'انظر عناوين IP ومتصفحات المستخدمين، أنهِ جلسته أو احظر عنوانه.',
      value: `${formatNumber(stats.liveSessions)} جلسة نشطة`,
      tone: 'bg-brand-50 text-brand-700',
    },
    {
      id: 'moderation' as const,
      icon: ShieldAlert,
      title: 'فاحص المحتوى الآلي',
      description: 'بلاغات الروابط والأرقام والمصطلحات المحظورة داخل البروفايلات.',
      value: `${formatNumber(stats.pendingFlags)} بلاغ محتوى`,
      tone: 'bg-rose-50 text-rose-700',
    },
    {
      id: 'users' as const,
      icon: Users,
      title: 'إدارة المستخدمين',
      description: 'توثيق، تمييز، تعديل أي حقل، تعيين كلمة مرور أو حذف الحساب.',
      value: `${formatNumber(stats.freelancers)} مستقل`,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      id: 'reports' as const,
      icon: Flag,
      title: 'البلاغات الواردة',
      description: 'مراجعة بلاغات المستخدمين واتخاذ الإجراء المناسب.',
      value: `${formatNumber(stats.pendingReports)} قيد الانتظار`,
      tone: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="relative overflow-hidden rounded-4xl border border-slate-100 bg-linear-to-br from-cyan-50 via-white to-sky-50 p-6 text-slate-900 shadow-xl shadow-slate-200/40 sm:p-8">
        <div className="pointer-events-none absolute -inset-e-16 -top-20 size-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
              <ShieldCheck className="size-4 text-orange-500" />
              صلاحيات إدارية
            </span>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">لوحة إدارة الدليل</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              تحكم كامل: أزرار طوارئ للنظام، جلسات وعناوين IP، فاحص محتوى آلي،
              وتوثيق أو تعديل أي حساب مباشرة من الجدول.
            </p>
          </div>
          {stats.pendingReports > 0 ? (
            <button
              type="button"
              onClick={() => setTab('reports')}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
            >
              <AlertTriangle className="size-5 text-amber-600" />
              {formatNumber(stats.pendingReports)} بلاغ بحاجة للمراجعة
            </button>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              <UserCheck className="size-5" />
              لا توجد بلاغات معلقة
            </span>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="إجمالي المستقلين"
          value={formatNumber(stats.freelancers)}
          hint={`${formatNumber(stats.activeFreelancers)} حساب نشط`}
          tone="brand"
        />
        <StatCard
          icon={Star}
          label="التقييمات"
          value={formatNumber(stats.reviews)}
          hint="إجمالي تقييمات العملاء"
          tone="amber"
        />
        <StatCard
          icon={Flag}
          label="بلاغات معلقة"
          value={formatNumber(stats.pendingReports)}
          hint="تحتاج إلى مراجعة"
          tone={stats.pendingReports > 0 ? 'rose' : 'emerald'}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label="حسابات موثّقة"
          value={formatNumber(stats.verifiedFreelancers)}
          hint="العلامة الزرقاء من الإدارة"
          tone="sky"
        />
        <StatCard
          icon={ShieldAlert}
          label="بلاغات محتوى"
          value={formatNumber(stats.pendingFlags)}
          hint="كشفها الفاحص الآلي"
          tone={stats.pendingFlags > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          icon={MonitorSmartphone}
          label="جلسات نشطة"
          value={formatNumber(stats.liveSessions)}
          hint="متصلة خلال 30 دقيقة"
          tone="brand"
        />
        <StatCard
          icon={Waves}
          label="عناوين محظورة"
          value={formatNumber(stats.blockedIps)}
          hint={maintenanceActive ? 'وضع الصيانة العام مفعّل' : 'الوصول مفتوح للمستخدمين'}
          tone={maintenanceActive ? 'rose' : 'slate'}
        />
      </div>

      {maintenanceActive ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
            <AlertTriangle className="size-5 shrink-0 text-rose-600" />
            وضع الصيانة العام مفعّل: جميع غير الأدمن يرون صفحة الصيانة الآن.
          </p>
          <button type="button" onClick={() => setTab('system')} className="btn btn-danger btn-sm">
            فتح أزرار الطوارئ
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((item) => {
          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                active
                  ? 'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm'
                  : 'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-brand-50 hover:text-brand-800'
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section className="card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">أكثر المهارات طلباً</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    توزيع المستقلين النشطين حسب المهارات.
                  </p>
                </div>
                <TrendingUp className="size-5 text-brand-600" />
              </div>

              {stats.topSkills.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {stats.topSkills.map((skill) => (
                    <div key={skill.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">
                          {skill.name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {formatNumber(skill.freelancers)} مستقل
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-linear-to-l from-brand-400 to-brand-700"
                          style={{
                            width: `${Math.max(
                              6,
                              (skill.freelancers / maxSkillCount) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                  لا توجد مهارات مرتبطة بمستقلين بعد.
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Eye className="size-3.5" />
                    زيارات البروفايلات
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {formatNumber(stats.profileViews)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                    <Sparkles className="size-3.5" />
                    بروفايلات مميزة
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {formatNumber(stats.featuredFreelancers)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {quickCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setTab(card.id)}
                  className="card flex w-full items-start gap-4 p-5 text-start transition hover:-translate-y-0.5 hover:border-brand-200"
                >
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
                  >
                    <card.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-900">
                        {card.title}
                      </p>
                      <Badge tone="slate">{card.value}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      {card.description}
                    </p>
                  </div>
                </button>
              ))}

              <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs font-semibold leading-6 text-brand-900 sm:col-span-2">
                المنصة تعمل كدليل مباشر فقط: لا مدفوعات ولا وساطة مالية. دور
                الإدارة هو ضبط جودة المحتوى ومراجعة البلاغات.
              </div>
            </section>
          </div>
        ) : null}

        <Suspense fallback={<PageLoader label="جارٍ تحميل القسم..." />}>
          {tab === 'users' ? <AdminUsersPanel /> : null}
          {tab === 'security' ? <PasswordChangePanel /> : null}
          {tab === 'danger-zone' ? <AdminPlatformWipePanel /> : null}
          {tab === 'system' ? <AdminSystemPanel /> : null}
          {tab === 'sessions' ? <AdminSessionsPanel /> : null}
          {tab === 'moderation' ? <AdminModerationPanel /> : null}
          {tab === 'reports' ? <AdminReportsPanel /> : null}
          {tab === 'reviews' ? <AdminReviewsPanel /> : null}
          {tab === 'notifications' ? <AdminNotificationsPanel /> : null}
          {tab === 'community' ? <CommunityDashboardPanel /> : null}
          {tab === 'parent-verifications' ? <AdminParentVerificationsPanel /> : null}
          {tab === 'support' ? <AdminSupportPanel /> : null}
          {tab === 'orders' ? <AdminOrdersPanel /> : null}
          {tab === 'services' ? <AdminServicesPanel /> : null}
          {tab === 'points' ? <AdminPointsPanel /> : null}
          {tab === 'articles' ? <AdminArticlesPanel /> : null}
          {tab === 'conversations' ? <AdminConversationsPanel /> : null}
          {tab === 'audit' ? <AdminAuditPanel /> : null}
        </Suspense>
      </div>
    </div>
  );
};
