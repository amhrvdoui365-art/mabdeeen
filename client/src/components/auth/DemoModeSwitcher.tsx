import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, ChevronDown, ChevronUp, HeartHandshake, LoaderCircle, Search, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/lib/utils';
import type { Role } from '@/types';
import { authApi } from '@/services/auth.service';
import { getErrorMessage } from '@/services/api';

const demoRoles: { role: Role; label: string; icon: typeof UsersRound; destination: string }[] = [
  { role: 'Freelancer', label: 'حساب مستقل (Demo)', icon: BriefcaseBusiness, destination: '/dashboard' },
  { role: 'Buyer', label: 'حساب عميل (Demo)', icon: Search, destination: '/buyer' },
  { role: 'Parent', label: 'حساب ولي الأمر (Demo)', icon: HeartHandshake, destination: '/parent' },
  { role: 'Admin', label: 'لوحة الإدارة (Demo)', icon: UsersRound, destination: '/admin' },
];

interface DemoModeSwitcherProps {
  mode?: 'floating' | 'inline';
}

export const DemoModeSwitcher = ({ mode = 'floating' }: DemoModeSwitcherProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginDemo, user } = useAuth();
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const options = useQuery({
    queryKey: ['demo-login-options'],
    queryFn: authApi.demoOptions,
    staleTime: 30_000,
    retry: false,
  });

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (!options.data?.enabled || (mode === 'floating' && isAuthPage && !user)) return null;

  const enterDemo = async (role: Role) => {
    setPendingRole(role);
    setError('');
    try {
      const user = await loginDemo(role);
      navigate(user.role === 'Admin' ? (user.isFullDemoAdmin ? '/admin' : '/community') : getDashboardPath(user.role), { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'تعذر فتح حساب العرض. حاول مرة أخرى.'));
    } finally {
      setPendingRole(null);
    }
  };

  return (
    <div className={mode === 'inline' ? '' : 'fixed bottom-4 right-4 z-[90] w-[min(22rem,calc(100vw-2rem))]'}>
      {mode === 'floating' ? <>
        {expanded ? <section dir="rtl" aria-labelledby="demo-switcher-floating-title" className="mb-2 rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl shadow-slate-950/20">
          <DemoPanelContent mode={mode} options={options.data} pendingRole={pendingRole} error={error} enterDemo={enterDemo} />
        </section> : null}
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="ms-auto flex min-h-12 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 font-extrabold text-violet-950 shadow-lg shadow-slate-950/15 transition hover:bg-violet-50">
          <UsersRound className="size-5 text-violet-700"/> حسابات العرض السريع (Demo) {expanded ? <ChevronDown className="size-4"/> : <ChevronUp className="size-4"/>}
        </button>
      </> : <section dir="rtl" aria-labelledby="demo-switcher-inline-title" className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
        <DemoPanelContent mode={mode} options={options.data} pendingRole={pendingRole} error={error} enterDemo={enterDemo} />
      </section>}
    </div>
  );
};

const DemoPanelContent = ({ mode, options, pendingRole, error, enterDemo }: {
  mode: 'floating' | 'inline';
  options: { enabled: boolean; adminFullAccess: boolean };
  pendingRole: Role | null;
  error: string;
  enterDemo: (role: Role) => Promise<void>;
}) => (
    <>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-violet-700"><UsersRound className="size-5" /></span>
        <div>
          <h2 id={mode === 'inline' ? 'demo-switcher-inline-title' : 'demo-switcher-floating-title'} className="font-black text-violet-950">حسابات العرض السريع (Demo)</h2>
          <p className="mt-1 text-xs leading-5 text-violet-900">هذه الحسابات مخصصة لتجربة المنصة أثناء العرض، ويمكنك التبديل بينها في أي وقت.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {demoRoles.map(({ role, label, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={pendingRole !== null}
            onClick={() => void enterDemo(role)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-2 py-2 text-xs font-extrabold text-violet-950 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
          >
            {pendingRole === role ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
            {role === 'Admin' && !options.adminFullAccess ? 'المجتمع (Demo)' : label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
    </>
);
