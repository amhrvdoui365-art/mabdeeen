import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Home, LoaderCircle, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { parentApi } from '@/services/parent.service';

export const FreelancerVerificationGate = ({ onClose }: { onClose: () => void }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  
  const start = useMutation({
    mutationFn: () => parentApi.startVerification(email.trim()),
    onSuccess: async (result) => {
      setEmailSent(result.sent);
      toast.success('تم إرسال رابط التوثيق إلى بريد ولي الأمر.');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر إرسال رسالة التوثيق.')),
  });

  useEffect(() => {
    if (!user || user.accountStatus === 'ACTIVE') return undefined;
    const timer = window.setInterval(() => {
      void refreshUser().catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [refreshUser, user?.accountStatus]);

  if (!user) return null;
  const awaitingReview = user.accountStatus === 'PENDING_ADMIN_REVIEW';
  const rejected = user.accountStatus === 'REJECTED';

  return (
    <div dir="rtl" className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4 pb-6 pt-20 backdrop-blur-[2px]">
      <section role="dialog" aria-modal="true" aria-labelledby="verification-title" className="max-h-[calc(100vh-6rem)] w-full max-w-2xl overflow-y-auto rounded-4xl border border-cyan-100 bg-white shadow-2xl shadow-cyan-950/20">
        <div className="bg-gradient-to-l from-cyan-600 via-sky-500 to-blue-600 px-6 py-8 text-white sm:px-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30"><ShieldCheck className="size-8"/></span>
              <div>
                <p className="text-sm font-bold text-cyan-50">أهلاً {user.name}</p>
                <h1 id="verification-title" className="mt-1 text-2xl font-black sm:text-3xl">وثّق حسابك للبدء</h1>
              </div>
            </div>
            <button type="button" onClick={() => { navigate('/'); onClose(); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25" aria-label="إغلاق التوثيق والعودة إلى الصفحة الرئيسية"><Home className="size-4"/><span className="hidden sm:inline">الرئيسية</span></button>
          </div>
          <p className="mt-5 max-w-2xl leading-7 text-cyan-50">لحماية حسابات المبدعين الصغار، يلزم توثيق ولي الأمر ومراجعة الإدارة قبل استخدام بقية المنصة. بياناتك محفوظة، ولن يظهر ملفك أو خدماتك للعملاء قبل التفعيل.</p>
        </div>

        <div className="space-y-6 p-5 sm:p-9">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Mail, title: 'إرسال الرابط', detail: 'أدخل بريد ولي الأمر وسنرسل له رابط التوثيق تلقائيًا.', color: 'bg-cyan-50 text-cyan-700' },
              { icon: UserCheck, title: 'ولي الأمر يوثّق', detail: 'يفتح الرابط، يلتقط صورة ويجيب عن مسألة بسيطة.', color: 'bg-orange-50 text-orange-700' },
              { icon: ShieldCheck, title: 'الإدارة تراجع', detail: 'بعد الموافقة يتفعل الحساب تلقائياً.', color: 'bg-lime-50 text-lime-700' },
            ].map(({ icon: Icon, title, detail, color }, index) => (
              <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}><Icon className="size-5"/></div>
                <p className="mt-3 text-sm font-black text-slate-900"><span className="me-1 text-slate-400">{index + 1}.</span>{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>

          {awaitingReview ? (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-3"><LoaderCircle className="size-6 animate-spin text-amber-700"/><div><h2 className="font-black text-amber-950">طلبك قيد مراجعة الإدارة</h2><p className="mt-1 text-sm leading-6 text-amber-900">تم استلام توثيق ولي أمرك. سنفعّل حسابك تلقائياً فور الموافقة؛ تتحقق الصفحة من الحالة كل عدة ثوانٍ.</p></div></div>
            </div>
          ) : (
            <div className="space-y-4">
              {rejected ? (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900"><div className="flex items-center gap-3"><AlertCircle className="size-6 shrink-0 text-rose-600"/><div><h2 className="font-black">لم تتم الموافقة على التوثيق السابق</h2><p className="mt-1 text-sm leading-6">يمكنك إرسال رابط توثيق جديد لولي الأمر وإعادة التقديم من هنا.</p></div></div></div>
              ) : null}
              <div className="rounded-2xl border border-cyan-100 bg-gradient-to-l from-cyan-50/80 to-white p-5 sm:p-6">
              <h2 className="font-black text-slate-900">الخطوة الأولى: أرسل رابط التوثيق لولي أمرك</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">اكتب بريد ولي الأمر لإرسال رابط التوثيق تلقائيًا.</p>
              <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setEmailSent(false); start.mutate(); }}>
                <input type="email" inputMode="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parent@example.com" className="input min-w-0 flex-1 text-start" aria-label="Parent email address"/>
                <button type="submit" disabled={start.isPending || !email.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-3 font-extrabold text-white transition hover:bg-cyan-600 active:translate-y-0.5 active:border-b-0 disabled:opacity-50">{start.isPending ? 'Sending...' : 'إرسال رابط التوثيق'} </button>
              </form>
              {start.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{getErrorMessage(start.error, 'تعذر إنشاء رابط التوثيق')}</p> : null}
              {emailSent ? <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-extrabold text-emerald-900"><CheckCircle2 className="size-5 shrink-0"/>تم إرسال رابط التوثيق تلقائيًا إلى بريد ولي الأمر.</p></div> : null}
              </div>
            </div>
          )}

          <p className="text-center text-xs leading-5 text-slate-500">لن تتمكن من تصفح أقسام المنصة قبل التفعيل. يمكنك تسجيل الخروج والعودة لاحقاً؛ حالة التوثيق محفوظة.</p>
        </div>
      </section>
    </div>
  );
};
