import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, BadgeCheck, CheckCircle2, Clock3, Gift, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { rewardsApi, type RewardItem } from '@/services/rewards.service';
import { getErrorMessage } from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { servicesApi } from '@/services/services.service';

const rewardIcon = (code: RewardItem['code']) => code === 'premium_badge' ? Award : code === 'featured_week' ? Sparkles : BadgeCheck;

export const RewardsPanel = () => {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const servicesQuery = useQuery({ queryKey: ['my-services'], queryFn: servicesApi.listMine });
  const rewardsQuery = useQuery({ queryKey: ['rewards'], queryFn: rewardsApi.get });
  const redeemMutation = useMutation({
    mutationFn: ({ code, serviceId }: { code: RewardItem['code']; serviceId?: string }) => rewardsApi.redeem(code, serviceId),
    onSuccess: async (result) => {
      setNotice(`المكافأة مفعّلة حتى ${new Date(result.expiresAt).toLocaleDateString('ar-EG')}.`);
      await queryClient.invalidateQueries({ queryKey: ['rewards'] });
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      await queryClient.invalidateQueries({ queryKey: ['all-platform-services'] });
      await queryClient.invalidateQueries({ queryKey: ['my-services'] });
    },
    onError: (error) => setNotice(getErrorMessage(error, 'تعذر استبدال النقاط.')),
  });
  const claimMutation = useMutation({
    mutationFn: (milestone: number) => rewardsApi.claim(milestone),
    onSuccess: async ({ milestone }) => {
      setNotice(`تم تفعيل هدية ${milestone} نقطة بنجاح.`);
      setSelectedMilestone(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['rewards'] }), queryClient.invalidateQueries({ queryKey: ['my-profile'] })]);
    },
    onError: (error) => setNotice(getErrorMessage(error, 'تعذر استلام الهدية.')),
  });

  if (rewardsQuery.isPending) return <div className="grid min-h-64 place-items-center rounded-3xl bg-white text-sm text-slate-500">جارٍ تحميل رصيد النقاط…</div>;
  if (rewardsQuery.isError || !rewardsQuery.data) return <ErrorState message="تعذر تحميل متجر المكافآت." onRetry={() => void rewardsQuery.refetch()} />;

  const data = rewardsQuery.data;
  const nextCost = Math.min(...data.rewards.map((reward) => reward.cost));
  const progress = Math.min(100, Math.round((data.points / nextCost) * 100));
  const milestones = [100, 200, 250, 500, 1000, 2500];
  const nextMilestone = milestones.find((threshold) => threshold > data.lifetimePoints) ?? 2500;
  const previousMilestone = [...milestones].reverse().find((threshold) => threshold <= data.lifetimePoints) ?? 0;
  const lifetimeProgress = data.lifetimePoints >= 2500 ? 100 : Math.min(100, Math.round(((data.lifetimePoints - previousMilestone) / (nextMilestone - previousMilestone)) * 100));
  const selectedClaim = data.claimedMilestones.find((item) => item.milestone === selectedMilestone);
  const activeBenefits = [
    { title: 'شارة مبدع متميز', expiry: data.benefits.premiumBadgeUntil },
    { title: 'شارة موثوق من المكافآت', expiry: data.benefits.verifiedUntil },
    { title: 'إبراز الملف والخدمات', expiry: data.benefits.featuredUntil },
    ...data.benefits.featuredServices.map((service) => ({ title: `خدمة مميزة: ${service.title}`, expiry: service.expiresAt })),
  ].filter((item) => item.expiry && Date.parse(item.expiry) > Date.now());

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-950 via-violet-900 to-fuchsia-800 p-5 text-white shadow-xl sm:p-7">
      <div className="pointer-events-none absolute -end-10 -top-16 size-48 rounded-full bg-pink-400/20 blur-3xl" />
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Star className="size-4 text-amber-300" />برنامج مكافآت سالكة</span><h2 className="mt-4 text-2xl font-black sm:text-3xl">نقاطك تصنع فرصاً جديدة</h2><p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">تكسب 50 نقطة عند تأكيد العميل استلام المشروع. استبدل نقاطك بمزايا ترفع حضورك.</p></div>
        <div className="min-w-40 rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur"><span className="text-4xl font-black tabular-nums">{data.points}</span><span className="mt-1 block text-xs font-bold text-indigo-100">نقطة متاحة</span></div>
      </div>
      <div className="relative mt-6"><div className="mb-2 flex justify-between text-xs font-bold text-indigo-100"><span>التقدم نحو المكافأة التالية</span><span>{data.points} / {nextCost}</span></div><div className="h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-linear-to-l from-amber-300 via-pink-300 to-cyan-200 transition-[width] duration-700" style={{ width: `${progress}%` }} /></div></div>
    </section>

    {activeBenefits.length ? <section className="card p-4 sm:p-5"><h3 className="flex items-center gap-2 font-extrabold text-slate-900"><CheckCircle2 className="size-5 text-emerald-600" />مزاياك النشطة</h3><div className="mt-3 flex flex-wrap gap-2">{activeBenefits.map((item) => <span key={item.title} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><Clock3 className="size-3.5" />{item.title} · حتى {new Date(item.expiry!).toLocaleDateString('ar-EG')}</span>)}</div></section> : null}

    <section><div className="mb-3 flex items-center gap-2"><Gift className="size-5 text-violet-600" /><h3 className="font-extrabold text-slate-900">متجر المكافآت</h3></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.rewards.map((reward) => {
      const Icon = rewardIcon(reward.code);
      const canRedeem = data.points >= reward.cost;
      return <article key={reward.code} className="card flex min-w-0 flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><span className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-100 to-pink-100 text-indigo-700"><Icon className="size-6" /></span><h4 className="mt-4 font-extrabold text-slate-900">{reward.title}</h4><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{reward.description}</p>{reward.code === 'featured_week' ? <select aria-label="اختر الخدمة لإبرازها" value={selectedServiceId} onChange={(event) => setSelectedServiceId(event.target.value)} className="input mt-3"><option value="">اختر خدمتك النشطة</option>{(servicesQuery.data ?? []).filter((service) => service.status === 'active').map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select> : null}<div className="mt-4 flex items-center justify-between gap-2"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">{reward.cost} نقطة</span><span className="text-[11px] font-semibold text-slate-400">{reward.durationDays} يوم</span></div><button type="button" onClick={() => { setNotice(null); redeemMutation.mutate({ code: reward.code, serviceId: reward.code === 'featured_week' ? selectedServiceId : undefined }); }} disabled={!canRedeem || redeemMutation.isPending || (reward.code === 'featured_week' && !selectedServiceId)} className="btn btn-primary mt-4 w-full disabled:bg-slate-200 disabled:shadow-none">{redeemMutation.isPending ? 'جارٍ الاستبدال…' : canRedeem ? 'استبدال النقاط' : `ينقصك ${reward.cost - data.points} نقطة`}</button></article>;
    })}</div></section>

    <section className="card min-w-0 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">هدايا الإنجاز</h3><p className="mt-1 text-xs text-slate-500">تُحتسب من إجمالي النقاط المكتسبة، ولا تخصم من رصيد المتجر.</p></div><Gift className="size-6 text-fuchsia-600" /></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-300 transition-[width] duration-700" style={{ width: `${lifetimeProgress}%` }} /></div><p className="mt-2 text-xs text-slate-500">{data.lifetimePoints} / 2500 · {data.lifetimePoints >= 2500 ? 'وصلت إلى الهدف النهائي!' : `فاضل لك ${nextMilestone - data.lifetimePoints} نقطة للوصول إلى ${nextMilestone}.`}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{milestones.map((threshold) => { const claimed = data.claimedMilestones.find((item) => item.milestone === threshold); const ready = data.lifetimePoints >= threshold && !claimed; return <button type="button" key={threshold} onClick={() => ready && setSelectedMilestone(threshold)} disabled={!ready} className={`flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border p-3 text-start transition hover:-translate-y-0.5 ${ready ? 'border-fuchsia-200 bg-fuchsia-50 shadow-md shadow-fuchsia-100' : 'border-slate-100 bg-slate-50'}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${ready ? 'animate-pulse bg-fuchsia-100 text-fuchsia-700 shadow-[0_0_22px_rgba(217,70,239,.35)]' : claimed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}><Gift className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">هدية {threshold} نقطة</strong><span className="mt-1 block truncate text-xs text-slate-500">{claimed ? `تم الاستلام · حتى ${new Date(claimed.expiresAt).toLocaleDateString('ar-EG')}` : ready ? 'اضغط لاستلام هديتك' : `فاضل لك ${Math.max(0, threshold - data.lifetimePoints)} نقطة`}</span></span></button>; })}</div></section>
    <Modal open={selectedMilestone !== null} onClose={() => setSelectedMilestone(null)} title="استلام هدية الإنجاز" footer={<div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setSelectedMilestone(null)}>إغلاق</button><button type="button" className="btn btn-primary" disabled={claimMutation.isPending} onClick={() => selectedMilestone !== null && claimMutation.mutate(selectedMilestone)}>{claimMutation.isPending ? 'جارٍ التفعيل...' : 'تفعيل المكافأة'}</button></div>}><div className="py-4 text-center"><Gift className="mx-auto size-14 text-fuchsia-600" /><p className="mt-4 text-lg font-extrabold text-slate-900">مبروك! وصلت إلى {selectedMilestone} نقطة</p><p className="mt-2 text-sm leading-6 text-slate-600">سيتم تفعيل مكافأة الإنجاز على حسابك فوراً.</p>{selectedClaim ? <p className="mt-2 text-xs text-emerald-700">مفعلة حتى {new Date(selectedClaim.expiresAt).toLocaleDateString('ar-EG')}</p> : null}</div></Modal>
    {notice ? <p role="status" className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">{notice}</p> : null}
    <section className="card p-4 sm:p-5"><h3 className="font-extrabold text-slate-900">سجل النقاط</h3>{data.transactions.length ? <ul className="mt-3 divide-y divide-slate-100">{data.transactions.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"><span className="font-semibold text-slate-600">{item.reason}</span><span className={`font-black ${item.amount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{item.amount > 0 ? '+' : ''}{item.amount}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">ستظهر هنا النقاط المكتسبة والمكافآت المستبدلة.</p>}</section>
  </div>;
};
