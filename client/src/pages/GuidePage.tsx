import {
  ArrowLeft, BookOpenCheck, BriefcaseBusiness,
  HeartHandshake, LifeBuoy, LockKeyhole, MessageCircle, ShieldCheck, UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const paths = [
  {
    icon: BriefcaseBusiness,
    title: 'أنا مبدع أو مستقل',
    description: 'اعرض ما تصنعه وتعلّمه خطوة خطوة.',
    steps: [
      'أنشئ حسابك بمساعدة أسرتك إذا احتجت.',
      'أضف اسمًا مناسبًا وصورة ومهاراتك.',
      'ارفع مشروعًا أو أضف خدمة تشرح ما تستطيع تقديمه.',
      'تابع طلباتك ورسائلك، وخذ رأي ولي أمرك قبل أي اتفاق أو خطوة مالية.',
    ],
  },
  {
    icon: UsersRound,
    title: 'أريد طلب خدمة',
    description: 'ابحث عن الشخص المناسب واشرح له ما تحتاجه.',
    steps: [
      'ابحث بالكلمات أو المهارة التي تريدها.',
      'اقرأ وصف الخدمة والأعمال السابقة.',
      'اكتب طلبك بوضوح واسأل باحترام.',
      'تابع حالة الطلب، ثم راجع العمل وشارك تقييمك.',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'أنا ولي أمر',
    description: 'تابع رحلة ابنك بعد موافقته على ربط الحسابين.',
    steps: [
      'أنشئ حساب ولي أمر وأرسل طلب ربط لحساب ابنك.',
      'انتظر موافقته؛ هو يختار مشاركة حسابه معك.',
      'بعد الموافقة، راجع ملفه ومشاريعه وطلباته وتقييماته وملفات التسليم.',
      'يمكنك معاينة الملفات؛ ويظهر التنزيل بعد اعتماد العميل.',
    ],
  },
];

const safetyTips = [
  { icon: LockKeyhole, title: 'احفظ معلوماتك', text: 'لا تكتب كلمة المرور أو رقم الهاتف أو عنوان البيت في ملفك أو رسائلك.' },
  { icon: MessageCircle, title: 'تحدث بلطف', text: 'احترم الجميع، ولا ترسل كلامًا جارحًا أو محتوى غير مناسب لعمرك.' },
  { icon: ShieldCheck, title: 'شارك ما تملكه', text: 'ارفع أعمالك أنت فقط، أو أعمالًا لديك إذن بمشاركتها.' },
  { icon: LifeBuoy, title: 'اطلب المساعدة', text: 'إذا أزعجك شيء، أخبر ولي أمرك واستخدم زر الدعم.' },
];

const GuideCard = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

export const GuidePage = () => {
  useDocumentTitle('دليل مبدعين');

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-cyan-100 bg-gradient-to-l from-cyan-100 via-white to-orange-50">
        <div className="container-page py-10 sm:py-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-cyan-800 shadow-sm">
            <BookOpenCheck className="size-4" /> دليلك في مبدعين
          </span>
          <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
            موهبتك تبدأ بخطوة!
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
            مبدعين مكان تتعلم فيه، وتعرض مشاريعك، وتتعرف على أعمال الآخرين. اختر الجزء الذي يخصك واتبع الخطوات البسيطة.
          </p>
          <nav aria-label="أقسام الدليل" className="mt-6 flex flex-wrap gap-2">
            {([['start', 'كيف أبدأ؟'], ['creator', 'اختيار الدور'], ['parent', 'الطلبات'], ['safety', 'الأمان']] as const).map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-bold text-cyan-900 hover:bg-cyan-50">{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <div className="container-page space-y-5 py-8 sm:py-10">
        <GuideCard id="start" title="كيف أبدأ؟">
          <ol className="grid gap-3 sm:grid-cols-2">
            {['أنشئ حسابًا واختر نوعه الصحيح.', 'أكمل ملفك بمعلومات مناسبة.', 'أضف مشروعًا أو ابحث عن خدمة.', 'تواصل باحترام، واستمتع بالتعلّم!'].map((step, index) => (
              <li key={step} className="flex items-center gap-3 rounded-2xl bg-cyan-50/70 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white font-black text-cyan-800">{index + 1}</span>
                <span className="text-sm font-semibold leading-6 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </GuideCard>

        <GuideCard id="creator" title="اختر ما تريد فعله">
          <div className="grid gap-4 lg:grid-cols-3">
            {paths.map(({ icon: Icon, title, description, steps }) => (
              <article key={title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-white text-cyan-800 shadow-sm"><Icon className="size-5" /></span>
                <h3 className="mt-3 text-lg font-black text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                <ol className="mt-4 space-y-3">
                  {steps.map((step, index) => <li key={step} className="flex gap-2 text-sm leading-6 text-slate-700"><span className="font-black text-cyan-700">{index + 1}.</span><span>{step}</span></li>)}
                </ol>
              </article>
            ))}
          </div>
        </GuideCard>

        <GuideCard id="parent" title="كيف أتابع طلباتي؟">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['افتح الطلبات', 'ستجد طلباتك والرسائل وتحديثات حالة كل طلب في صفحة الطلبات.'],
              ['راجع التسليم', 'شاهد الملفات التي أرسلها المستقل، واطلب تعديلًا أو اقبل العمل إذا كان مناسبًا.'],
              ['شارك رأيك', 'بعد انتهاء الطلب، اكتب تقييمًا لطيفًا وصادقًا يساعد الآخرين.'],
            ].map(([title, text]) => <article key={title} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
          </div>
          <Link to="/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-800 hover:underline">اذهب إلى الطلبات<ArrowLeft className="size-4" /></Link>
        </GuideCard>

        <GuideCard id="safety" title="أربع نصائح لتبقى آمنًا">
          <div className="grid gap-3 sm:grid-cols-2">
            {safetyTips.map(({ icon: Icon, title, text }) => <article key={title} className="flex gap-3 rounded-2xl border border-slate-100 p-4"><Icon className="mt-0.5 size-5 shrink-0 text-emerald-700" /><div><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></article>)}
          </div>
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            إذا كان عمرك أقل من 18 سنة، استخدم المنصة بمشاركة ولي أمرك، وراجعا معًا أي اتفاق أو موضوع مالي.
          </p>
        </GuideCard>

        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-l from-cyan-700 to-sky-600 p-6 text-white sm:flex-row sm:items-center">
          <div><h2 className="text-xl font-black">جاهز تبدأ؟</h2><p className="mt-2 text-sm leading-6 text-cyan-50">تصفّح المشاريع والخدمات، أو شارك مشروعك القادم.</p></div>
          <div className="flex flex-wrap gap-3">
            <Link to="/services" className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-cyan-800 hover:bg-cyan-50">اكتشف الخدمات</Link>
            <Link to="/community" className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">زر المجتمع</Link>
          </div>
        </section>
      </div>
    </main>
  );
};
