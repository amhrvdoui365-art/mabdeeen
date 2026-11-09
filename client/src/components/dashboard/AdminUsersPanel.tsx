import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  LogIn,
  Pencil,
  ShieldCheck,
  Search,
  ShieldOff,
  Star,
  Trash2,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate, formatNumber } from '@/lib/utils';
import { getErrorMessage, IMPERSONATION_ADMIN_TOKEN_KEY, tokenStorage } from '@/services/api';
import { adminApi, type AdminUsersParams } from '@/services/admin.service';
import type { AdminUser, AdminUserPatch } from '@/types';

type Dialog =
  | { kind: 'feature'; user: AdminUser }
  | { kind: 'edit'; user: AdminUser }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | null;

interface EditForm {
  name: string;
  title: string;
  bio: string;
  location: string;
  minBudget: string;
  hourlyRate: string;
  avgResponseHours: string;
  isAvailable: boolean;
}

const FEATURE_OPTIONS = [
  { value: '0', label: 'بدون انتهاء' },
  { value: '7', label: 'أسبوع' },
  { value: '30', label: 'شهر' },
  { value: '90', label: '3 أشهر' },
];

const textOrNull = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const numOrNull = (value: string): number | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

const fromUser = (user: AdminUser): EditForm => ({
  name: user.name,
  title: user.title ?? '',
  bio: user.bio ?? '',
  location: user.location ?? '',
  minBudget: user.minBudget === null ? '' : String(user.minBudget),
  hourlyRate: user.hourlyRate === null ? '' : String(user.hourlyRate),
  avgResponseHours: user.avgResponseHours === null ? '' : String(user.avgResponseHours),
  isAvailable: user.isAvailable,
});

const buildPatch = (user: AdminUser, form: EditForm): AdminUserPatch => {
  const patch: AdminUserPatch = {};
  const name = form.name.trim();

  if (name.length >= 2 && name !== user.name) {
    patch.name = name;
  }

  const title = textOrNull(form.title);

  if (title !== (user.title ?? null)) {
    patch.title = title;
  }

  const bio = textOrNull(form.bio);

  if (bio !== (user.bio ?? null)) {
    patch.bio = bio;
  }

  const location = textOrNull(form.location);

  if (location !== (user.location ?? null)) {
    patch.location = location;
  }

  const minBudget = numOrNull(form.minBudget);

  if (minBudget !== (user.minBudget ?? null)) {
    patch.minBudget = minBudget;
  }

  const hourlyRate = numOrNull(form.hourlyRate);

  if (hourlyRate !== (user.hourlyRate ?? null)) {
    patch.hourlyRate = hourlyRate;
  }

  const avgResponseHours = numOrNull(form.avgResponseHours);

  if (avgResponseHours !== (user.avgResponseHours ?? null)) {
    patch.avgResponseHours = avgResponseHours;
  }

  if (form.isAvailable !== user.isAvailable) {
    patch.isAvailable = form.isAvailable;
  }

  return patch;
};

const actionButtonClass =
  'rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-50';

export const AdminUsersPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q, 400);
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [role, setRole] = useState<'' | 'Freelancer' | 'Buyer' | 'Parent' | 'Admin'>('');
  const [verified, setVerified] = useState<'' | 'yes' | 'no'>('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [featureDays, setFeatureDays] = useState('30');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, status, role, verified]);

  useEffect(() => {
    if (dialog?.kind === 'edit') {
      setForm(fromUser(dialog.user));
    }

    if (dialog?.kind === 'feature') {
      setFeatureDays(dialog.user.featuredUntil ? '30' : '0');
    }

    if (dialog?.kind === 'password') {
      setNewPassword('');
    }
  }, [dialog]);

  const params: AdminUsersParams = useMemo(
    () => ({
      q: debouncedQ.trim() || undefined,
      status: status || undefined,
      role: role || undefined,
      verified: verified === '' ? undefined : verified === 'yes',
      page,
      limit: 20,
    }),
    [debouncedQ, status, role, verified, page],
  );

  const usersQuery = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminApi.users(params),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    await queryClient.invalidateQueries({ queryKey: ['featured-freelancers'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setUserStatus(id, isActive),
    onSuccess: async (updated) => {
      toast.success(updated.isActive ? 'تم تفعيل الحساب' : 'تم تجميد الحساب');
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث حالة الحساب')),
  });

  const verifiedMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      adminApi.setUserVerified(id, isVerified),
    onSuccess: async (updated) => {
      toast.success(updated.isVerified ? 'تم توثيق الحساب بالعلامة الزرقاء' : 'تم سحب التوثيق');
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث التوثيق')),
  });

  const featuredMutation = useMutation({
    mutationFn: ({
      id,
      isFeatured,
      featuredUntil,
    }: {
      id: string;
      isFeatured: boolean;
      featuredUntil: string | null;
    }) => adminApi.setUserFeatured(id, isFeatured, featuredUntil),
    onSuccess: async (updated) => {
      toast.success(updated.isFeatured ? 'تم تمييز البروفايل في الصفحة الرئيسية' : 'تمت إزالة التمييز');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث التمييز')),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUserPatch }) =>
      adminApi.manageUser(id, payload),
    onSuccess: async () => {
      toast.success('تم حفظ تعديلات البروفايل');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حفظ التعديلات')),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      adminApi.setUserPassword(id, password),
    onSuccess: async () => {
      toast.success('تم تعيين كلمة مرور جديدة، والدخول الحالي أصبح غير صالح');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تغيير كلمة المرور')),
  });

  const impersonateMutation = useMutation({
    mutationFn: adminApi.impersonateUser,
    onSuccess: ({ token }) => {
      const adminToken = tokenStorage.get();
      if (!adminToken) { toast.error('انتهت جلسة الإدارة، سجّل الدخول من جديد.'); return; }
      window.sessionStorage.setItem(IMPERSONATION_ADMIN_TOKEN_KEY, adminToken);
      tokenStorage.set(token);
      queryClient.clear();
      window.location.assign('/');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر بدء جلسة المعاينة')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: async () => {
      toast.success('تم حذف الحساب نهائياً');
      setDialog(null);
      await invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر حذف الحساب')),
  });

  const submitEdit = () => {
    if (!dialog || dialog.kind !== 'edit' || !form) {
      return;
    }

    const patch = buildPatch(dialog.user, form);

    if (Object.keys(patch).length === 0) {
      toast.error('لم يتغير أي حقل لحفظه');
      return;
    }

    editMutation.mutate({ id: dialog.user.id, payload: patch });
  };

  const commitFeature = () => {
    if (dialog?.kind !== 'feature') {
      return;
    }

    const days = Number(featureDays);
    const featuredUntil =
      days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

    featuredMutation.mutate({
      id: dialog.user.id,
      isFeatured: true,
      featuredUntil,
    });
  };

  const unfeature = (user: AdminUser) => {
    featuredMutation.mutate({ id: user.id, isFeatured: false, featuredUntil: null });
  };

  const isBusy =
    statusMutation.isPending ||
    verifiedMutation.isPending ||
    featuredMutation.isPending ||
    editMutation.isPending ||
    passwordMutation.isPending ||
    deleteMutation.isPending || impersonateMutation.isPending;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">إدارة المستخدمين (وضع كامل)</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            وثّق الحسابات، ميّز البروفايلات، عدّل أي حقل، أو أعين كلمة مرور وحذف الحساب مباشرة من الجدول.
          </p>
        </div>
        {usersQuery.isFetching ? <Spinner className="size-5" /> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="input ps-9"
            placeholder="ابحث بالاسم أو البريد الإلكتروني..."
            aria-label="البحث في المستخدمين"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as '' | 'active' | 'inactive')}
          className="input"
          aria-label="فلترة بالحالة"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">مجمّد</option>
        </select>

        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as '' | 'Freelancer' | 'Buyer' | 'Parent' | 'Admin')
          }
          className="input"
          aria-label="فلترة بالدور"
        >
          <option value="">كل الأدوار</option>
          <option value="Freelancer">مستقل</option>
          <option value="Buyer">مشتري</option>
          <option value="Parent">ولي أمر</option>
          <option value="Admin">أدمن</option>
        </select>

        <select
          value={verified}
          onChange={(event) => setVerified(event.target.value as '' | 'yes' | 'no')}
          className="input"
          aria-label="فلترة بالتوثيق"
        >
          <option value="">التوثيق: الكل</option>
          <option value="yes">موثّق فقط</option>
          <option value="no">غير موثّق</option>
        </select>
      </div>

      <div className="mt-5">
        {usersQuery.isError ? (
          <ErrorState message="تعذر تحميل المستخدمين." onRetry={() => void usersQuery.refetch()} />
        ) : usersQuery.isPending ? (
          <PageLoader label="جارٍ تحميل المستخدمين..." />
        ) : usersQuery.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-250 border-collapse text-start">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-start">المستخدم</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start">التقييم</th>
                    <th className="px-4 py-3 text-start">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersQuery.data.items.map((user) => {
                    const isFreelancer = user.role === 'Freelancer';
                    const canModerate = user.role !== 'Admin';

                    return (
                      <tr key={user.id} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={user.name}
                              src={user.avatarUrl}
                              className="size-10 rounded-xl"
                              textClassName="text-xs"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-extrabold text-slate-900">
                                  {user.name}
                                </p>
                                {user.isVerified ? <VerifiedBadge /> : null}
                                {user.isFeatured ? (
                                  <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
                                ) : null}
                              </div>
                              <p className="truncate text-[11px] font-semibold text-slate-400">
                                {user.title || 'بدون مسمى'} — انضم {formatDate(user.createdAt)}
                              </p>
                              {user.pendingFlags > 0 ? (
                                <p className="mt-0.5 text-[11px] font-bold text-rose-600">
                                  {formatNumber(user.pendingFlags)} بلاغ محتوى مفتوح
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge tone={user.isActive ? 'emerald' : 'rose'}>
                              {user.isActive ? 'نشط' : 'مجمّد'}
                            </Badge>
                            <Badge tone={user.role === 'Admin' ? 'sky' : 'slate'}>
                              {user.role === 'Admin'
                                ? 'أدمن'
                                : user.role === 'Parent'
                                  ? 'ولي أمر'
                                : user.role === 'Buyer'
                                  ? 'مشتري'
                                  : 'مستقل'}
                            </Badge>
                            {isFreelancer ? (
                              <Badge tone={user.isAvailable ? 'brand' : 'slate'}>
                                {user.isAvailable ? 'متاح للعمل' : 'غير متاح'}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-slate-800">
                              {user.avgRating.toFixed(1)}
                              <span className="text-[11px] font-semibold text-slate-400">
                                {' '}
                                ({formatNumber(user.reviewCount)} تقييم)
                              </span>
                            </p>
                            {isFreelancer ? (
                              <p className="text-[11px] text-slate-400">
                                يرد خلال{' '}
                                {user.avgResponseHours === null
                                  ? 'غير محدد'
                                  : `${formatNumber(user.avgResponseHours)} ساعة`}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isFreelancer ? (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    verifiedMutation.isPending &&
                                    verifiedMutation.variables?.id === user.id
                                  }
                                  onClick={() =>
                                    verifiedMutation.mutate({
                                      id: user.id,
                                      isVerified: !user.isVerified,
                                    })
                                  }
                                  className={
                                    user.isVerified
                                      ? 'rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-600 transition hover:bg-sky-100'
                                      : actionButtonClass
                                  }
                                  title={user.isVerified ? 'سحب التوثيق' : 'منح العلامة الزرقاء'}
                                >
                                  {user.isVerified ? (
                                    <ShieldOff className="size-4" />
                                  ) : (
                                    <ShieldCheck className="size-4" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    user.isFeatured ? unfeature(user) : setDialog({ kind: 'feature', user })
                                  }
                                  className={
                                    user.isFeatured
                                      ? 'rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 transition hover:bg-amber-100'
                                      : actionButtonClass
                                  }
                                  title={user.isFeatured ? 'إزالة التمييز' : 'تمييز البروفايل'}
                                >
                                  <Star
                                    className={
                                      user.isFeatured
                                        ? 'size-4 fill-amber-400 text-amber-400'
                                        : 'size-4'
                                    }
                                  />
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'edit', user })}
                              className={actionButtonClass}
                              title="تعديل البيانات يدوياً"
                            >
                              <Pencil className="size-4" />
                            </button>

                            {canModerate && user.isActive ? <button type="button" disabled={isBusy} onClick={() => {
                              if (window.confirm(`بدء جلسة معاينة لمدة 15 دقيقة كـ ${user.name}؟ سيتم تسجيل الجلسة والإجراءات.`)) impersonateMutation.mutate(user.id);
                            }} className={actionButtonClass} title="الدخول مؤقتًا بصفة هذا المستخدم"><LogIn className="size-4"/></button> : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'password', user })}
                              className={actionButtonClass}
                              title="تعيين كلمة مرور جديدة"
                            >
                              <KeyRound className="size-4" />
                            </button>

                            {canModerate ? (
                              <button
                                type="button"
                                disabled={
                                  statusMutation.isPending &&
                                  statusMutation.variables?.id === user.id
                                }
                                onClick={() =>
                                  statusMutation.mutate({ id: user.id, isActive: !user.isActive })
                                }
                                className={
                                  user.isActive
                                    ? 'rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50'
                                    : 'rounded-lg border border-emerald-200 p-2 text-emerald-600 transition hover:bg-emerald-50'
                                }
                                title={user.isActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
                              >
                                {statusMutation.isPending &&
                                statusMutation.variables?.id === user.id ? (
                                  <Spinner className="size-4" />
                                ) : user.isActive ? (
                                  <UserX className="size-4" />
                                ) : (
                                  <UserCheck className="size-4" />
                                )}
                              </button>
                            ) : null}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setDialog({ kind: 'delete', user })}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-50"
                              title="حذف الحساب نهائياً"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Pagination pagination={usersQuery.data.pagination} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="لا يوجد مستخدمون مطابقون"
            description="جرّب تغيير كلمة البحث أو إزالة الفلاتر."
          />
        )}
      </div>

      <Modal
        open={dialog?.kind === 'feature'}
        onClose={() => setDialog(null)}
        title="تمييز البروفايل"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={featuredMutation.isPending}
              onClick={commitFeature}
            >
              {featuredMutation.isPending ? <Spinner className="size-4" /> : <Star className="size-4" />}
              تمييز في الرئيسية
            </button>
          </div>
        }
      >
        {dialog?.kind === 'feature' ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">
              سيظهر <strong className="text-slate-900">{dialog.user.name}</strong> في شريط
              «مستقلون مميزون» أعلى الصفحة الرئيسية حتى انتهاء المدة.
            </p>
            <label className="label">
              مدة التمييز
              <select
                value={featureDays}
                onChange={(event) => setFeatureDays(event.target.value)}
                className="input mt-1.5"
              >
                {FEATURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'edit'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'edit' ? `تعديل ${dialog.user.name}` : 'تعديل'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={editMutation.isPending || !form}
              onClick={submitEdit}
            >
              {editMutation.isPending ? <Spinner className="size-4" /> : <Pencil className="size-4" />}
              حفظ التعديلات
            </button>
          </div>
        }
      >
        {form ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">
              الاسم
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="input mt-1.5"
                minLength={2}
                maxLength={100}
              />
            </label>
            <label className="label">
              المسمى الوظيفي
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="input mt-1.5"
                maxLength={120}
                placeholder="مثال: مصمم واجهات"
              />
            </label>
            <label className="label">
              الموقع
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className="input mt-1.5"
                maxLength={120}
                placeholder="القاهرة، مصر"
              />
            </label>
            <label className="label">
              متوسط الرد (ساعات)
              <input
                type="number"
                min={0}
                max={168}
                step="0.5"
                value={form.avgResponseHours}
                onChange={(event) => setForm({ ...form, avgResponseHours: event.target.value })}
                className="input mt-1.5"
                placeholder="غير محدد"
              />
            </label>
            <label className="label">
              أدنى نقاط للخدمة
              <input
                type="number"
                min={0}
                step="1"
                value={form.minBudget}
                onChange={(event) => setForm({ ...form, minBudget: event.target.value })}
                className="input mt-1.5"
                placeholder="بدون"
              />
            </label>
            <label className="label">
              نقاط الساعة
              <input
                type="number"
                min={0}
                step="1"
                value={form.hourlyRate}
                onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })}
                className="input mt-1.5"
                placeholder="بدون"
              />
            </label>
            <label className="label sm:col-span-2">
              نبذة التعريف
              <textarea
                rows={4}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                className="input mt-1.5 resize-y"
                maxLength={2000}
              />
            </label>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <Switch
                checked={form.isAvailable}
                onChange={(checked) => setForm({ ...form, isAvailable: checked })}
                label="متاح لاستقبال المشاريع"
                description="يظهر شارة «متاح» في البروفايل ونتائج البحث."
              />
            </div>
            <p className="text-xs leading-6 text-slate-500 sm:col-span-2">
              تعديل النبذة أو المسمى يمر تلقائياً على فاحص المحتوى؛ الروابط والأرقام المخالفة تُبلّغ
              في لوحة «فاحص المحتوى».
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === 'password'}
        onClose={() => setDialog(null)}
        title="تعيين كلمة مرور جديدة"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              إلغاء
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={passwordMutation.isPending || newPassword.trim().length < 12}
              onClick={() => {
                if (dialog?.kind === 'password') {
                  passwordMutation.mutate({ id: dialog.user.id, password: newPassword.trim() });
                }
              }}
            >
              {passwordMutation.isPending ? <Spinner className="size-4" /> : <KeyRound className="size-4" />}
              تعيين كلمة المرور
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            {dialog?.kind === 'password' ? dialog.user.email : ''} ستحتاج هذه الكلمة للدخول، وتنتهي
            كل جلساته الحالية فوراً.
          </p>
          <label className="label">
            كلمة المرور الجديدة
            <input
              dir="ltr"
              type="text"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="input mt-1.5"
              minLength={12}
              maxLength={120}
              placeholder="12 حرفاً على الأقل"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={dialog?.kind === 'delete'}
        onClose={() => setDialog(null)}
        title="حذف الحساب نهائياً"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setDialog(null)}>
              تراجع
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleteMutation.isPending || dialog?.kind !== 'delete'}
              onClick={() => {
                if (dialog?.kind === 'delete') {
                  deleteMutation.mutate(dialog.user.id);
                }
              }}
            >
              {deleteMutation.isPending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
              حذف نهائي
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-rose-700">
          سيتم حذف بيانات هذا الحساب ومشاريعه وتقييماته بشكل لا يمكن التراجع عنه. إن كان الهدف إيقاف
          المستخدم فقط، استخدم «تجميد الحساب» بدل الحذف.
        </p>
      </Modal>
    </section>
  );
};
