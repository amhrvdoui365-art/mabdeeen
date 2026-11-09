import { useMutation } from '@tanstack/react-query';
import { AlertOctagon, DatabaseZap, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/services/api';
import { adminApi, PLATFORM_WIPE_CONFIRMATION } from '@/services/admin.service';

export const AdminPlatformWipePanel = () => {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => adminApi.wipePlatform(confirmation),
    onSuccess: (result) => {
      const total = Object.values(result.deletedRows).reduce((sum, count) => sum + count, 0);
      toast.success(`اكتمل المسح: حُذفت ${total.toLocaleString('ar-EG')} سجلًا، وبقيت ${result.preservedAdminAccounts} حسابات إدارة. سجّل الدخول مجددًا.`);
      if (result.warnings.length) toast.error('تم مسح قاعدة البيانات، لكن يلزم مراجعة تنظيف بعض مجلدات الملفات.');
      logout();
      navigate('/login', { replace: true });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'فشل مسح البيانات. لم يتم تأكيد اكتمال العملية.')),
  });
  const close = () => { if (mutation.isPending) return; setOpen(false); setConfirmation(''); };
  return <>
    <section dir="rtl" className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-sm">
      <div className="border-b border-rose-100 bg-rose-50 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-800"><DatabaseZap className="size-5"/></span><div><h2 className="text-lg font-black text-rose-950">منطقة الإجراءات الخطرة</h2><p className="mt-1 text-sm leading-6 text-rose-900">تمسح محتوى المنصة وبيانات المستخدمين نهائيًا. حسابات الإدارة نفسها تبقى، لكن ستنتهي جلساتها وتحتاج إلى تسجيل الدخول مجددًا.</p></div></div></div>
      <div className="p-5 sm:p-6"><ul className="space-y-2 text-sm leading-6 text-slate-700"><li>• حذف حسابات غير الأدمن، الخدمات، الطلبات، المحادثات، النقاط، التقييمات، البلاغات والمقالات.</li><li>• حذف ملفات الرفع والتحقق والمرفقات من مجلدات الخادم.</li><li>• إعادة إعدادات المنصة المحفوظة إلى القيم الافتراضية. قائمة المهارات الأساسية يعاد توليدها تلقائيًا.</li><li>• إنشاء سجل تدقيق واحد يوثق تنفيذ المسح.</li></ul><button type="button" onClick={() => setOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-rose-800"><Trash2 className="size-4"/>مسح بيانات المنصة بالكامل</button></div>
    </section>
    <Modal open={open} onClose={close} title="تأكيد مسح بيانات المنصة" size="md">
      <div dir="rtl" className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"><AlertOctagon className="mt-0.5 size-5 shrink-0"/><p>هذا الإجراء نهائي ولا يمكن التراجع عنه. سيحذف البيانات والملفات، وينهي جلسات الإدارة الحالية. تبقى حسابات الإدارة فقط.</p></div>
        <label className="block text-sm font-bold text-slate-800">اكتب العبارة التالية للتأكيد: <code dir="ltr" className="mt-2 block select-all rounded-lg bg-slate-100 p-3 text-left font-mono text-sm">{PLATFORM_WIPE_CONFIRMATION}</code><input autoComplete="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input mt-2 font-mono" aria-label="عبارة تأكيد مسح البيانات"/></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={close} disabled={mutation.isPending} className="btn btn-secondary">إلغاء</button><button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || confirmation !== PLATFORM_WIPE_CONFIRMATION} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? <Spinner className="size-4"/> : <Trash2 className="size-4"/>}تأكيد المسح النهائي</button></div>
      </div>
    </Modal>
  </>;
};
