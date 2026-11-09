import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LockKeyhole, MessageSquareText, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/services/api';
import { adminApi, type AdminConversationsParams } from '@/services/admin.service';
import { AdminFilePreviewButton } from './AdminFilePreviewButton';
import type { AdminConversation, AdminConversationMessage } from '@/types';

export const AdminConversationsPanel = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const queryText = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminConversation | null>(null);
  const [reason, setReason] = useState('');
  const [transcript, setTranscript] = useState<AdminConversationMessage[] | null>(null);

  useEffect(() => setPage(1), [queryText]);

  const params: AdminConversationsParams = { q: queryText.trim() || undefined, page, limit: 15 };
  const conversationsQuery = useQuery({
    queryKey: ['admin-conversations', params],
    queryFn: () => adminApi.conversations(params),
  });

  const transcriptMutation = useMutation({
    mutationFn: adminApi.conversationMessages,
    onSuccess: (items) => {
      setTranscript(items);
      void queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      toast.success('\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629');
    },
    onError: (error) => toast.error(getErrorMessage(error, '\u062a\u0639\u0630\u0631 \u0641\u062a\u062d \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629')),
  });

  const openConversation = (conversation: AdminConversation) => {
    setSelected(conversation);
    setReason('');
    setTranscript(null);
  };

  const viewTranscript = () => {
    if (!selected || reason.trim().length < 5) return;
    transcriptMutation.mutate({
      participantAId: selected.participantAId,
      participantBId: selected.participantBId,
      serviceId: selected.serviceId,
      reason: reason.trim(),
    });
  };

  const closeTranscript = () => {
    setSelected(null);
    setTranscript(null);
    setReason('');
    transcriptMutation.reset();
  };

  return (
    <section className="card p-5 sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><MessageSquareText className="size-5" /></span>
          <div><h2 className="text-lg font-extrabold text-slate-900">{'\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a'}</h2><p className="mt-1 max-w-2xl text-xs font-semibold leading-6 text-slate-500">{'\u0639\u0631\u0636 \u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u064a\u0629. \u064a\u062a\u0637\u0644\u0628 \u0641\u062a\u062d \u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0633\u0628\u0628\u064b\u0627 \u0648\u064a\u064f\u0633\u062c\u0651\u0644 \u0641\u064a \u0633\u062c\u0644 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629.'}</p></div>
        </div>
        {conversationsQuery.isFetching ? <Spinner className="size-5" /> : null}
      </div>

      <div className="relative mt-4 max-w-xl">
        <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="input ps-9" placeholder={'\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0623\u0648 \u0628\u0631\u064a\u062f \u0623\u062d\u062f \u0637\u0631\u0641\u064a \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629'} aria-label={'\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a'} />
      </div>

      <div className="mt-5 space-y-3">
        {conversationsQuery.isError ? <ErrorState message={'\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a'} onRetry={() => void conversationsQuery.refetch()} /> : null}
        {conversationsQuery.isPending ? <PageLoader label={'\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a'} /> : null}
        {conversationsQuery.data?.items.map((conversation) => (
          <article key={`${conversation.participantAId}:${conversation.participantBId}:${conversation.serviceId ?? 'direct'}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <Avatar name={conversation.participantAName} src={conversation.participantAAvatarUrl} className="size-10 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900"><a href={`mailto:${conversation.participantAEmail}`} className="text-cyan-800 underline">{conversation.participantAName}</a> <span className="text-slate-400">↔</span> <a href={`mailto:${conversation.participantBEmail}`} className="text-cyan-800 underline">{conversation.participantBName}</a></p>
              <p className="mt-1 truncate text-xs text-slate-500" dir="ltr">{conversation.participantAEmail} · {conversation.participantBEmail}</p>
              <p className="mt-1 text-xs font-semibold text-brand-700">{conversation.serviceTitle && conversation.serviceId && conversation.serviceFreelancerId ? <a href={`/freelancers/${conversation.serviceFreelancerId}?serviceId=${conversation.serviceId}`} target="_blank" rel="noreferrer" className="underline">{conversation.serviceTitle} ↗</a> : conversation.serviceTitle ?? '\u0645\u062d\u0627\u062f\u062b\u0629 \u0639\u0627\u0645\u0629'} · {conversation.messageCount} {'\u0631\u0633\u0627\u0644\u0629'} · {formatDate(conversation.lastMessageAt)}</p>
            </div>
            <button type="button" onClick={() => openConversation(conversation)} className="btn btn-secondary btn-sm shrink-0"><Eye className="size-4" />{'\u0641\u062a\u062d \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629'}</button>
          </article>
        ))}
        {conversationsQuery.data?.items.length === 0 ? <EmptyState icon={MessageSquareText} title={'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062d\u0627\u062f\u062b\u0627\u062a'} description={'\u062c\u0631\u0651\u0628 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0628\u062d\u062b.'} compact /> : null}
      </div>
      {conversationsQuery.data ? <div className="mt-5"><Pagination pagination={conversationsQuery.data.pagination} onPageChange={setPage} /></div> : null}

      <Modal open={Boolean(selected)} onClose={closeTranscript} title={selected ? `${selected.participantAName} ↔ ${selected.participantBName}` : ''} size="xl">
        <div className="space-y-4" dir="rtl">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <LockKeyhole className="mt-0.5 size-5 shrink-0" />
            <p>{'\u064a\u062c\u0628 \u0643\u062a\u0627\u0628\u0629 \u0633\u0628\u0628 \u0645\u062d\u062f\u062f \u0642\u0628\u0644 \u0639\u0631\u0636 \u0627\u0644\u0631\u0633\u0627\u0626\u0644. \u0633\u064a\u064f\u0633\u062c\u0651\u0644 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0648\u0627\u0644\u0633\u0628\u0628 \u0648\u0648\u0642\u062a \u0627\u0644\u062f\u062e\u0648\u0644.'}</p>
          </div>
          <label className="block"><span className="label">{'\u0633\u0628\u0628 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629'}</span><textarea className="input min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder={'\u0645\u062b\u0627\u0644: \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0644\u0627\u063a \u0645\u062a\u0639\u0644\u0642 \u0628\u0627\u0644\u0623\u0645\u0627\u0646.'} /></label>
          <button type="button" onClick={viewTranscript} disabled={reason.trim().length < 5 || transcriptMutation.isPending} className="btn btn-primary w-full">{transcriptMutation.isPending ? <Spinner className="size-4" /> : <ShieldCheck className="size-4" />}{'\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0633\u0628\u0628 \u0648\u0639\u0631\u0636 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629'}</button>
          {transcript ? <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
            {transcript.map((message) => {
              const mine = message.senderId === selected?.participantAId;
              return <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${mine ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
                <p className="text-[10px] font-extrabold opacity-70">{mine ? selected?.participantAName : selected?.participantBName}</p>
                {message.content ? <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">{message.content}</p> : null}
                {message.attachment ? <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 text-xs"><AdminFilePreviewButton name={message.attachment.name} mimeType={message.attachment.mimeType} load={() => adminApi.conversationAttachment(message.id)}/><span>{(message.attachment.size / 1024 / 1024).toFixed(1)} MB</span></div> : null}
                <time className="mt-1 block text-[10px] opacity-60">{formatDate(message.createdAt)}</time>
              </div></div>;
            })}
          </div> : null}
        </div>
      </Modal>
    </section>
  );
};
