import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Megaphone } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi } from '@/services/admin.service';
import { Spinner } from '@/components/ui/Spinner';

export const AdminNotificationsPanel = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ['admin-notifications'], queryFn: adminApi.notifications });

  const createMutation = useMutation({
    mutationFn: adminApi.createNotification,
    onSuccess: async () => {
      setTitle('');
      setMessage('');
      toast.success('تم نشر الإشعار للجميع');
      await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['sitewide-notification'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر نشر الإشعار')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminApi.setNotificationActive(id, active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['sitewide-notification'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'تعذر تحديث الإشعار')),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate({ title: title.trim(), message: message.trim() });
  };

  return (
    <section className="space-y-5">
      <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Megaphone className="size-5" /></span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">إرسال إشعار عام</h2>
            <p className="text-xs font-semibold text-slate-500">سيظهر الإشعار في أعلى الموقع حتى يتم إيقافه.</p>
          </div>
        </div>
        <label className="block text-sm font-bold text-slate-700">
          عنوان الإشعار
          <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="input mt-1.5" />
        </label>
        <label className="block text-sm font-bold text-slate-700">
          نص الإشعار
          <textarea required minLength={3} maxLength={1000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="input mt-1.5 resize-y" />
        </label>
        <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
          {createMutation.isPending ? <Spinner className="size-4" /> : <Bell className="size-4" />}
          نشر للجميع
        </button>
      </form>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-900">سجل الإشعارات</h2>
        <div className="mt-4 space-y-3">
          {query.data?.length ? query.data.map((item) => (
            <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                  <span className={item.isActive ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500'}>
                    {item.isActive ? 'نشط' : 'متوقف'}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{item.message}</p>
                <time className="mt-2 block text-xs text-slate-400">{formatDate(item.createdAt)}</time>
              </div>
              <button type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: item.id, active: !item.isActive })} className="btn btn-secondary shrink-0">
                {item.isActive ? 'إيقاف الإشعار' : 'إعادة النشر'}
              </button>
            </article>
          )) : <p className="text-sm font-semibold text-slate-500">لا توجد إشعارات بعد.</p>}
        </div>
      </section>
    </section>
  );
};
