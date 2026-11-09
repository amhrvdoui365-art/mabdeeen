import { useState } from 'react';
import { Eye, LogOut, ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/admin.service';
import { IMPERSONATION_ADMIN_TOKEN_KEY, tokenStorage } from '@/services/api';

export const AdminImpersonationBanner = () => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [active] = useState(() => typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem(IMPERSONATION_ADMIN_TOKEN_KEY)));
  if (!active) return null;
  const stop = async () => {
    if (busy) return;
    setBusy(true);
    try { await adminApi.stopImpersonation(); } catch { /* The short-lived user token may have expired; restoring the admin session still works. */ }
    const adminToken = window.sessionStorage.getItem(IMPERSONATION_ADMIN_TOKEN_KEY);
    window.sessionStorage.removeItem(IMPERSONATION_ADMIN_TOKEN_KEY);
    if (adminToken) tokenStorage.set(adminToken);
    else tokenStorage.clear();
    queryClient.clear();
    window.location.assign('/admin');
  };
  return <aside dir="rtl" className="sticky top-0 z-[100] border-b border-amber-300 bg-amber-100 px-3 py-2.5 text-amber-950 shadow-md" role="alert">
    <div className="container-page flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold sm:text-sm">
      <span className="inline-flex items-center gap-2"><ShieldAlert className="size-4"/><Eye className="size-4"/>أنت داخل جلسة معاينة مستخدم — الجلسة مؤقتة وتُسجَّل الإجراءات.</span>
      <button type="button" onClick={() => void stop()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-white hover:bg-amber-950 disabled:opacity-60"><LogOut className="size-4"/>{busy ? 'جارٍ الرجوع...' : 'إنهاء المعاينة والعودة للأدمن'}</button>
    </div>
  </aside>;
};
