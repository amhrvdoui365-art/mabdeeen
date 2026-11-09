import { useMutation } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { authApi } from '@/services/auth.service';
import { Spinner } from '@/components/ui/Spinner';

export const PasswordChangePanel = () => {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور. سجّل الدخول باستخدام كلمة المرور الجديدة.');
      logout();
      navigate('/login', { replace: true });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تغيير كلمة المرور')),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('تأكيد كلمة المرور غير مطابق.'); return; }
    mutation.mutate({ currentPassword, newPassword, confirmPassword });
  };
  return <section dir="rtl" className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-800"><KeyRound className="size-5"/></span><div><h2 className="font-black text-slate-900">تغيير كلمة المرور</h2><p className="mt-1 text-xs leading-6 text-slate-500">أدخل كلمة المرور الحالية واختر كلمة جديدة لا تقل عن 8 أحرف. ستنتهي الجلسات السابقة بعد التغيير.</p></div></div>
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold text-slate-700 sm:col-span-2">كلمة المرور الحالية<input required autoComplete="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="input mt-1" maxLength={120}/></label>
      <label className="block text-xs font-bold text-slate-700">كلمة المرور الجديدة<input required minLength={8} autoComplete="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input mt-1" maxLength={72}/></label>
      <label className="block text-xs font-bold text-slate-700">تأكيد كلمة المرور الجديدة<input required minLength={8} autoComplete="new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input mt-1" maxLength={72}/></label>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2"><p className="flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="size-4 text-emerald-700"/>لا نعرض كلمة المرور أو نخزنها كنص مقروء.</p><button type="submit" disabled={mutation.isPending || !currentPassword || newPassword.length < 8 || !confirmPassword} className="btn btn-primary">{mutation.isPending ? <Spinner className="size-4"/> : <KeyRound className="size-4"/>}تحديث كلمة المرور</button></div>
    </form>
  </section>;
};
