import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, HeartHandshake, Search, UsersRound, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/lib/utils';
import type { Role } from '@/types';
import { authApi } from '@/services/auth.service';
import { getErrorMessage } from '@/services/api';

const demoRoles: { role: Role; label: string; icon: typeof UsersRound; destination: string }[] = [
  { role: 'Freelancer', label: 'حساب مستقل (Demo)', icon: BriefcaseBusiness, destination: '/dashboard' },
  { role: 'Buyer', label: 'حساب عميل (Demo)', icon: Search, destination: '/buyer' },
  { role: 'Parent', label: 'حساب ولي الأمر (Demo)', icon: HeartHandshake, destination: '/parent' },
  { role: 'Admin', label: 'المجتمع والإدارة (Demo)', icon: UsersRound, destination: '/community' },
];

export const DemoModeSwitcher = () => {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const options = useQuery({
    queryKey: ['demo-login-options'],
    queryFn: authApi.demoOptions,
    staleTime: 30_000,
    retry: false,
  });

  if (!options.data?.enabled) return null;

  const enterDemo = async (role: Role, destination: string) => {
    setPendingRole(role);
    setError('');
    try {
      const user = await loginDemo(role);
      navigate(user.role === 'Admin' ? destination : getDashboardPath(user.role), { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'تعذر فتح حساب العرض. حاول مرة أخرى.'));
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4" aria-labelledby="demo-switcher-title">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-violet-700"><UsersRound className="size-5" /></span>
        <div>
          <h2 id="demo-switcher-title" className="font-black text-violet-950">تجربة سريعة للحكام (Demo)</h2>
          <p className="mt-1 text-xs leading-6 text-violet-900">هذه الحسابات مخصصة لتجربة مميزات المنصة سريعًا أثناء العرض. تنتهي الجلسة بعد ساعتين.</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {demoRoles.map(({ role, label, icon: Icon, destination }) => (
          <button
            key={role}
            type="button"
            disabled={pendingRole !== null}
            onClick={() => void enterDemo(role, destination)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-extrabold text-violet-950 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
          >
            {pendingRole === role ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
            {label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
    </section>
  );
};
