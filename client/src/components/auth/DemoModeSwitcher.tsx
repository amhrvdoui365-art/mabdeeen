import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, ChevronDown, HeartHandshake, LoaderCircle, Search, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath } from '@/lib/utils';
import type { Role } from '@/types';
import { authApi } from '@/services/auth.service';
import { getErrorMessage } from '@/services/api';

const demoRoles: { role: Role; label: string; icon: typeof UsersRound; destination: string }[] = [
  { role: 'Freelancer', label: 'مستقل (Demo)', icon: BriefcaseBusiness, destination: '/dashboard' },
  { role: 'Buyer', label: 'عميل (Demo)', icon: Search, destination: '/buyer' },
  { role: 'Parent', label: 'ولي الأمر (Demo)', icon: HeartHandshake, destination: '/parent' },
  { role: 'Admin', label: 'المجتمع (Demo)', icon: UsersRound, destination: '/community' },
];

export const DemoModeSwitcher = () => {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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
    <aside dir="rtl" className="fixed bottom-5 end-4 z-[80]">
      {isOpen ? (
        <section id="demo-switcher-panel" className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl shadow-slate-950/20" aria-labelledby="demo-switcher-title">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><UsersRound className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="demo-switcher-title" className="font-black text-violet-950">حسابات العرض السريع (Demo)</h2>
              <p className="mt-1 text-xs leading-5 text-violet-900">بدّل بين الأدوار في أي وقت. الجلسة تنتهي بعد ساعتين.</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="إغلاق حسابات العرض"><X className="size-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoRoles.map(({ role, label, icon: Icon, destination }) => (
              <button
                key={role}
                type="button"
                disabled={pendingRole !== null}
                onClick={() => void enterDemo(role, destination)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-2 py-2 text-xs font-extrabold text-violet-950 transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-wait disabled:opacity-60"
              >
                {pendingRole === role ? <LoaderCircle className="size-4 animate-spin" /> : <Icon className="size-4" />}
                {label}
              </button>
            ))}
          </div>
          {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="demo-switcher-panel"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-200 bg-violet-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xl shadow-violet-900/20 transition hover:bg-violet-800"
      >
        <UsersRound className="size-4" /> حسابات Demo <ChevronDown className={`size-4 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
};
