import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { renderGoogleSignInButton } from '@/lib/google-identity';
import { getErrorMessage } from '@/services/api';
import { authApi } from '@/services/auth.service';
import type { AuthUser } from '@/types';

type GoogleAccountType = 'Freelancer' | 'Buyer' | 'Parent';

export const GoogleAuthButton = ({ onSuccess, accountType }: { onSuccess: (user: AuthUser) => void; accountType?: GoogleAccountType }) => {
  const { completeOAuthLogin } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const callbackRef = useRef(onSuccess);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { callbackRef.current = onSuccess; }, [onSuccess]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        if (!buttonRef.current) return;
        cleanupRef.current = await renderGoogleSignInButton(buttonRef.current, async ({ credential }) => {
          if (!credential || busyRef.current) return;
          busyRef.current = true;
          setBusy(true);
          setError(null);
          try {
            const result = await authApi.googleVerify(credential, accountType);
            if (accountType && result.user.role !== accountType) {
              const roleName = result.user.role === 'Freelancer' ? 'مستقل' : result.user.role === 'Parent' ? 'ولي أمر' : 'مشتري';
              setError(`هذا البريد مرتبط بحساب ${roleName} بالفعل. سجّل الدخول إلى الحساب الحالي لإنشاء حساب جديد بنوع مختلف.`);
              return;
            }
            const user = await completeOAuthLogin(result.token);
            callbackRef.current(user);
          } catch (authError) {
            setError(getErrorMessage(authError, 'تعذر تسجيل الدخول باستخدام Google'));
          } finally {
            busyRef.current = false;
            setBusy(false);
          }
        }, Math.min(400, buttonRef.current.clientWidth || 400));
      } catch (initError) {
        if (active) setError(getErrorMessage(initError, 'تعذر تهيئة تسجيل الدخول باستخدام Google'));
      }
    };
    void initialize();
    return () => {
      active = false;
      cleanupRef.current?.();
    };
  }, [accountType, completeOAuthLogin]);

  return (
    <div>
      <div className="relative mx-auto flex min-h-12 w-full max-w-100 justify-center" dir="ltr" aria-busy={busy}>
        <div ref={buttonRef} className={busy ? 'pointer-events-none opacity-60' : ''} />
        {busy ? <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-xs font-bold text-slate-700">جارٍ تسجيل الدخول...</span> : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-center text-xs font-semibold leading-5 text-rose-600">{error}</p> : null}
    </div>
  );
};
