import {
  ArrowLeft, BadgeCheck, BookOpenCheck, BriefcaseBusiness, CheckCircle2,
  ChevronDown, CircleHelp, ClipboardList, Coins, FileText, Heart, HeartHandshake,
  LifeBuoy, LockKeyhole, MessageCircle, Search, ShieldCheck, Sparkles, UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const guideLinks = [
  { id: 'getting-started', label: 'إنشاء الحساب والبدء' },
  { id: 'young-creators', label: 'رحلة المبدع الصغير' },
  { id: 'roles', label: 'أنواع الحسابات' },
  { id: 'discover', label: 'البحث واكتشاف الخدمات' },
  { id: 'orders', label: 'الطلبات والتسليم' },
  { id: 'freelancer-tools', label: 'أدوات المستقل' },
  { id: 'community', label: 'المجتمع والمحتوى' },
  { id: 'points', label: 'النقاط والمكافآت' },
  { id: 'safety', label: 'الأمان والدعم' },
  { id: 'faq', label: 'الأسئلة الشائعة' },
];

const roles = [
  {
    icon: BriefcaseBusiness,
    title: 'المستقل',
    color: 'bg-cyan-50 text-cyan-800',
    description: 'اعرض مهاراتك ومشاريعك التقنية والإبداعية، وتابع الطلبات المتاحة لحسابك بمشاركة الأسرة عندما يكون المستخدم قاصرًا.',
    steps: ['أكمل الملف والمهارات مع ولي أمرك إذا كان عمرك أقل من 18 عامًا.', 'أرسل طلب التوثيق أو موافقة ولي الأمر إذا ظهرت في حسابك.', 'لا تقبل مهمة مدفوعة قبل مراجعتها مع ولي أمرك والتحقق من ملاءمتها لعُمرك.', 'تابع الطلبات والرسائل والتسليمات من لوحة المستقل، مع إشراف الأسرة على الترتيبات المالية.'],
  },
  {
    icon: UsersRound,
    title: 'العميل',
    color: 'bg-orange-50 text-orange-800',
    description: 'ابحث عن مستقل أو خدمة، ناقش تفاصيل المطلوب، ثم تابع الطلب والتسليم من مكان واحد.',
    steps: ['استخدم البحث والمهارات والمحافظة والميزانية والتقييم والتوفر.', 'راجع الملف والخدمة والسعر والوصف والأعمال السابقة.', 'أرسل طلبًا يتضمن موجزًا واضحًا لما تحتاجه.', 'تابع الرد والتسليم، واطلب تعديلًا أو اقبل النتيجة، ثم قيّم الطلب المكتمل.'],
  },
  {
    icon: HeartHandshake,
    title: 'ولي الأمر',
    color: 'bg-violet-50 text-violet-800',
    description: 'اربط حساب ولي الأمر بحساب الابن أو الابنة بإذن واضح، وتابع الصلاحيات المتاحة.',
    steps: ['أنشئ حساب ولي أمر مستقلًا.', 'أرسل طلب ربط إلى الحساب المطلوب وانتظر موافقته.', 'راجع الملف والخدمات والأنشطة المتاحة للحساب المرتبط.', 'تتطلب قراءة المحادثات ومرفقاتها تفعيل الإذن الخاص بها.'],
  },
];

const questions = [
  { q: 'هل يستطيع الطفل إنشاء حساب مستقل أو استقبال أرباح؟', a: 'تستهدف مبدعين عرض مشاريع الناشئة، لكن إتاحة الحساب والميزات تعتمد على العمر والضوابط السارية وموافقة ولي الأمر. لا توفر المنصة حاليًا محفظة أو تحويلًا أو سحبًا نقديًا؛ النقاط ليست أرباحًا. يجب أن يراجع ولي الأمر أي ترتيب مالي ويتحقق من ملاءمته لعمر الطفل والقواعد المنطبقة.' },
  { q: 'هل مبدعين تستلم ثمن الخدمة أو تحتفظ به؟', a: 'المنصة تعرض الخدمات والطلبات وتوفر متابعة رقمية لها. لا تظهر في مسار الطلب وسيلة دفع أو خدمة ضمان/حساب وسيط للأموال؛ اتفق مع الطرف الآخر بوضوح على تفاصيل المقابل قبل بدء العمل، ولا تعتبر النقاط رصيدًا نقديًا.' },
  { q: 'ماذا أفعل إذا لم يرد المستقل على الطلب؟', a: 'راجع حالة الطلب ورسائله من صفحة الطلبات. استخدم المحادثة داخل الطلب لتوضيح المطلوب، وإذا واجهت مشكلة في المنصة تواصل مع الدعم وأرفق ما يساعد على فهمها.' },
  { q: 'هل يمكنني طلب تعديل بعد التسليم؟', a: 'إذا أصبح التسليم بانتظار موافقتك، يمكنك طلب تعديل من داخل الطلب. اكتب الملاحظات المطلوبة بوضوح. بعد قبول التسليم، يستطيع طرفا الطلب تنزيل ملف التسليم أو نسخ رابط التسليم الخارجي.' },
  { q: 'ماذا تعني النقاط؟', a: 'النقاط وحدات داخلية للعرض والمكافآت في المنصة. لا تمثل نقدًا أو وديعة أو مبلغًا يمكن سحبه، وقد تختلف المكافآت وتكلفتها بحسب إعدادات المنصة.' },
  { q: 'كيف أطلب حذف محتوى أو أبلغ عن حساب؟', a: 'استخدم أداة الإبلاغ المتاحة في صفحة المستقل أو المحتوى، أو افتح محادثة مع الدعم. اذكر الرابط والسبب وأرفق دليلًا مناسبًا، من دون نشر بيانات حساسة.' },
  { q: 'هل رابط المعاينة يمنع نسخ الصور أو تصوير الشاشة؟', a: 'إجراءات حماية الوسائط تقلل بعض طرق التنزيل المباشر، لكنها لا تمنع تصوير الشاشة أو النسخ بوسائل أخرى. لا ترفع إلا محتوى تملك حق مشاركته، واتفق على حقوق استخدام التسليم كتابةً.' },
];

const ContentSection = ({ id, eyebrow, title, description, icon: Icon, children }: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Search;
  children: React.ReactNode;
}) => (
  <section id={id} className="scroll-mt-28 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
    <div className="flex items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-800"><Icon className="size-6" /></span>
      <div><p className="text-xs font-black tracking-wide text-cyan-700">{eyebrow}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p></div>
    </div>
    <div className="mt-6">{children}</div>
  </section>
);

export const GuidePage = () => {
  useDocumentTitle('دليل استخدام منصة مبدعين');

  return <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
    <section className="relative isolate overflow-hidden border-b border-cyan-100 bg-gradient-to-l from-cyan-100/70 via-white to-orange-50/80">
      <div className="pointer-events-none absolute -top-28 start-8 -z-10 size-80 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 end-0 -z-10 size-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="container-page grid gap-9 py-12 sm:py-16 lg:grid-cols-[1fr_320px] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/85 px-4 py-2 text-xs font-extrabold text-cyan-800"><BookOpenCheck className="size-4" /> الدليل العملي للمنصة</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">كل ما تحتاجه لاستخدام <span className="text-cyan-700">مبدعين</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">دليل خطوة بخطوة للمستقلين والعملاء وأولياء الأمور: من إنشاء الحساب والبحث، إلى الطلب والتسليم والنقاط والخصوصية.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link to="/register" className="inline-flex items-center gap-2 rounded-xl border-b-4 border-cyan-800 bg-cyan-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-200 transition hover:bg-cyan-700"><Sparkles className="size-4" />إنشاء حساب</Link><Link to="/services" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:border-cyan-200 hover:text-cyan-800">استكشاف الخدمات<ArrowLeft className="size-4" /></Link></div>
        </div>
        <nav aria-label="محتويات الدليل" className="rounded-3xl border border-white bg-white/90 p-5 shadow-xl shadow-cyan-100/50 backdrop-blur"><p className="font-extrabold text-slate-900">انتقل مباشرة إلى</p><ul className="mt-3 space-y-1">{guideLinks.map((item, index) => <li key={item.id}><a href={`#${item.id}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"><span>{item.label}</span><span className="text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span></a></li>)}</ul></nav>
      </div>
    </section>

    <div className="container-page space-y-6 py-8 sm:space-y-8 sm:py-12">
      <ContentSection id="getting-started" eyebrow="01 · البداية" title="أهلًا بك في مبدعين!" description="مبدعين مساحة عربية مجانية وممتعة لعرض المشاريع البرمجية والتصميمية وتطوير المهارات، بمشاركة الأسرة وإشرافها." icon={BadgeCheck}>
        <ol className="grid gap-3 sm:grid-cols-2">{['أنشئ حسابك بمساعدة أسرتك، وأكمل ملفك بمعلومات مناسبة وآمنة.', 'ارفع مشروعك أو أضف عملًا من إنجازك تملك حق مشاركته.', 'تواصل بلطف واحترام، وشارك أفكارك وكلمات التشجيع.', 'استمتع بالتعلّم وواصل تطوير مهاراتك وشارك إنجازاتك!'].map((step, index) => <li key={step} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><span className="text-xs font-black text-cyan-700">الخطوة {index + 1}</span><p className="mt-2 text-sm leading-6 text-slate-600">{step}</p></li>)}</ol>
        <div className="mt-4 flex flex-wrap gap-3"><Link to="/login" className="text-sm font-extrabold text-cyan-800 hover:underline">تسجيل الدخول</Link><Link to="/register" className="text-sm font-extrabold text-cyan-800 hover:underline">إنشاء حساب جديد</Link><Link to="/complete-profile" className="text-sm font-extrabold text-cyan-800 hover:underline">إكمال الملف</Link></div>
      </ContentSection>

      <ContentSection id="young-creators" eyebrow="02 · رحلة الناشئة" title="مساحة آمنة للتعلّم والإبداع" description="نرحب بالناشئة من عمر 8 إلى 18 سنة لعرض مواهبهم ومشاريعهم، مع مشاركة الأسرة وإشرافها بما يناسب عمر المبدع." icon={Sparkles}>
        <div className="grid gap-3 sm:grid-cols-3">{[
          ['كن لطيفًا', 'احترم الجميع، واختر كلمات مشجعة، وابتعد عن المحتوى المؤذي أو المسيء أو غير المناسب للعمر.'],
          ['حافظ على خصوصيتك', 'لا تشارك رقم هاتفك أو عنوانك أو كلمة مرورك أو أي معلومة شخصية حساسة.'],
          ['شارك بأمانة', 'اعرض أعمالك التي أنجزتها، أو الأعمال التي لديك إذن بمشاركتها.'],
        ].map(([title, text]) => <article key={title} className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><h3 className="font-extrabold text-cyan-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{text}</p></article>)}</div>
        <p className="mt-4 rounded-2xl bg-violet-50 p-4 text-sm leading-7 text-violet-950">النقاط وسيلة تشجيع ومكافآت داخلية لإبراز الأنشطة والمشاريع، وليست نقودًا. استمتع بمشاركة أفكارك وتعلّم أشياء جديدة مع مجتمع مبدعين! ✨</p>
      </ContentSection>

      <ContentSection id="roles" eyebrow="03 · الحسابات" title="اختر المسار المناسب لك" description="لكل دور صفحات وأدوات مختلفة. استخدم حسابك الشخصي فقط، ولا تشارك كلمة المرور أو رموز الدخول مع أي شخص." icon={UsersRound}>
        <div className="grid gap-4 lg:grid-cols-3">{roles.map(({ icon: Icon, title, color, description, steps }) => <article key={title} className="rounded-2xl border border-slate-100 p-5"><span className={`grid size-11 place-items-center rounded-xl ${color}`}><Icon className="size-5" /></span><h3 className="mt-3 text-lg font-black text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><ul className="mt-4 space-y-2">{steps.map((step) => <li key={step} className="flex gap-2 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />{step}</li>)}</ul></article>)}</div>
      </ContentSection>

      <ContentSection id="discover" eyebrow="04 · البحث والاكتشاف" title="اعثر على المستقل أو الخدمة المناسبة" description="ابدأ من الرئيسية للبحث عن المستقلين، أو افتح صفحة الخدمات لتصفح الخدمات المنشورة. راجع التفاصيل قبل إرسال طلبك." icon={Search}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          ['بحث المستقلين', 'ابحث بالاسم أو النبذة أو المسمى أو المهارة. تظهر النتائج على صفحات، ويُعاد ضبط الصفحة عند تغيير الفلاتر.'],
          ['فلاتر المستقلين', 'يمكن تضييق النتائج بالمهارة والمحافظة والميزانية والتقييم وسرعة الرد، أو إظهار المتاحين أو الموثقين أو المميزين فقط.'],
          ['بحث الخدمات', 'يبحث في عنوان الخدمة ووصفها وتصنيفها واسم المستقل. يمكن اختيار تصنيف وترتيب النتائج بالأحدث أو السعر.'],
          ['مراجعة الملف', 'افتح الملف العام لمراجعة المهارات والخدمات ومعرض الأعمال والتقييمات والبيانات التي اختار صاحبها نشرها.'],
        ].map(([title, text]) => <article key={title} className="rounded-2xl bg-slate-50 p-4"><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><Link to="/#freelancers" className="btn btn-primary">البحث عن مستقلين</Link><Link to="/services" className="btn btn-secondary">تصفح الخدمات</Link></div>
      </ContentSection>

      <ContentSection id="orders" eyebrow="05 · الطلب والتسليم" title="تابع الطلب من بدايته إلى إغلاقه" description="تظهر تفاصيل الطلب وموجزه ورسائله وحالته للمشتري والمستقل المشاركين فيه. استخدم المحادثة المرتبطة بالطلب لتوثيق المطلوب والتعديلات." icon={ClipboardList}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          ['طلب جديد', 'يرسل العميل موجز العمل، ويظهر الطلب للمستقل للقبول أو الرفض.'],
          ['مقبول وقيد التنفيذ', 'بعد القبول يبدأ المستقل التنفيذ ويحدّث حالة الطلب.'],
          ['تم التسليم', 'يرفع المستقل الملفات أو يرسل رابطًا للمعاينة. يراجع العميل النتيجة ويمكنه طلب تعديل أو قبولها.'],
          ['مكتمل أو مغلق', 'بعد قبول التسليم يكتمل الطلب. يمكن للعميل تقييم الطلب المكتمل. وتظل حالات الرفض والإلغاء ظاهرة في سجل الطلب.'],
        ].map(([title, text], index) => <article key={title} className="relative rounded-2xl border border-slate-100 bg-white p-4"><span className="grid size-8 place-items-center rounded-full bg-cyan-100 text-xs font-black text-cyan-900">{index + 1}</span><h3 className="mt-3 font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4"><h3 className="font-extrabold text-cyan-950">الملفات والروابط</h3><p className="mt-2 text-sm leading-7 text-cyan-950/80">يمكن للمشاركين معاينة التسليم وفق الصلاحيات. بعد قبول العميل، يتاح للمشتري والمستقل تنزيل ملف التسليم أو نسخ رابط التسليم الخارجي. حماية المعاينة تقلل بعض وسائل التنزيل ولا تمنع التصوير أو إعادة النسخ.</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"><h3 className="font-extrabold text-amber-950">قبل بدء العمل</h3><p className="mt-2 text-sm leading-7 text-amber-950/80">اكتب النطاق والمخرجات والموعد وعدد التعديلات وحقوق الاستخدام بوضوح. صفحة الطلب لا تُنشئ عقدًا تفصيليًا ولا تثبت تحويلًا ماليًا.</p></div></div>
        <Link to="/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-cyan-800 hover:underline">افتح صفحة الطلبات<ArrowLeft className="size-4" /></Link>
      </ContentSection>

      <ContentSection id="freelancer-tools" eyebrow="06 · مساحة المستقل" title="الملف والخدمات ومعرض الأعمال" description="حدّث حضورك المهني باستمرار؛ المعلومات الواضحة تساعد العملاء على فهم خبرتك وما تقدمه." icon={BriefcaseBusiness}>
        <div className="grid gap-3 md:grid-cols-2">{[
          ['الملف التعريفي', 'اكتب نبذة دقيقة، وأضف المسمى والمهارات والمحافظة والميزانية المتوقعة، وحدّث حالة التوفر.'],
          ['الخدمات', 'أضف عنوانًا ووصفًا وتصنيفًا وسعرًا بالنقاط ووسائط توضيحية. راجع الخدمة بعد نشرها، وأوقفها مؤقتًا إذا لم تعد متاحة.'],
          ['معرض الأعمال', 'اعرض أعمالًا تملك حق نشرها. اشرح دورك في كل مشروع ولا تضع بيانات عميل أو ملفًا سريًا دون إذن.'],
          ['لوحة المتابعة', 'راجع الطلبات الواردة، والرسائل، والإشعارات، والتقييمات، ورصيد النقاط والمكافآت المتاحة لحسابك.'],
        ].map(([title, text]) => <article key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-cyan-800"><FileText className="size-4" /></span><div><h3 className="font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></article>)}</div>
      </ContentSection>

      <ContentSection id="community" eyebrow="07 · المشاركة" title="المجتمع والمفضلة والإشعارات" description="تتيح هذه الأقسام اكتشاف المحتوى ومتابعة النشاط داخل المنصة. تعامل مع منشورات الآخرين باحترام واحفظ خصوصية أصحاب المشاريع." icon={BookOpenCheck}>
        <div className="grid gap-3 sm:grid-cols-3">{[
          [BookOpenCheck, 'المجتمع', 'انشر تجربة أو مشروعًا أو محتوى تعليميًا، وتفاعل مع المنشورات المتاحة. تجنب نشر معلومات شخصية أو مواد لا تملك حقوقها.'],
          [Heart, 'المفضلة', 'احفظ المستقلين أو العناصر التي تدعم المنصة حفظها لتعود إليها من حسابك.'],
          [MessageCircle, 'المحادثات والإشعارات', 'تابع رسائل الطلبات والتنبيهات المرتبطة بحسابك. أبلغ الدعم إذا وجدت رسالة أو محتوى مخالفًا.'],
        ].map(([Icon, title, text]) => { const FeatureIcon = Icon as typeof Heart; return <article key={title as string} className="rounded-2xl border border-slate-100 p-4"><FeatureIcon className="size-5 text-cyan-700" /><h3 className="mt-3 font-extrabold text-slate-900">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p></article>; })}</div>
        <div className="mt-4 flex flex-wrap gap-3"><Link to="/community" className="btn btn-secondary">زيارة المجتمع</Link><Link to="/favorites" className="btn btn-secondary">فتح المفضلة</Link></div>
      </ContentSection>

      <ContentSection id="points" eyebrow="08 · النقاط" title="كيف تفهم النقاط والمكافآت؟" description="النقاط قيمة داخلية للعرض أو المكافآت في المنصة، وليست أموالًا نقدية أو رصيدًا مصرفيًا." icon={Coins}>
        <ul className="space-y-3">{[
          'قد يظهر سعر الخدمة بالنقاط لتسهيل المقارنة داخل المنصة؛ لا يعني ذلك أن المنصة خصمت مبلغًا أو نفذت تحويلًا ماليًا.',
          'قد تُضاف مكافأة للمستقل بعد قبول التسليم وفق قيمة وإعدادات الإدارة السارية وقتها.',
          'تختلف المكافآت وشروطها وتكلفتها ومدة تفعيلها بحسب ما يظهر في صفحة المكافآت، وقد تتغير أو تتوقف.',
          'لا تفترض أن النقاط قابلة للبيع أو التحويل أو السحب النقدي؛ راجع وصف المكافأة وشروطها داخل حسابك.',
        ].map((text) => <li key={text} className="flex gap-2 text-sm leading-7 text-slate-600"><CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />{text}</li>)}</ul>
      </ContentSection>

      <ContentSection id="safety" eyebrow="09 · الأمان" title="احمِ حسابك وخصوصيتك" description="المزايا التقنية تساعد على تنظيم الاستخدام، لكنها لا تلغي مسؤولية كل مستخدم عن قراراته ومحتواه." icon={ShieldCheck}>
        <div className="grid gap-3 md:grid-cols-2">{[
          [LockKeyhole, 'بيانات الدخول', 'استخدم كلمة مرور قوية ولا ترسل كلمة المرور أو رمز التحقق إلى الدعم أو لأي مستخدم آخر. سجّل الخروج من الأجهزة المشتركة.'],
          [ShieldCheck, 'الملفات والوسائط', 'افحص الملفات والروابط قبل فتحها. لا ترفع ملفات تتضمن بيانات شخصية أو سرية دون موافقة أصحابها.'],
          [HeartHandshake, 'ولي الأمر', 'استخدام الحسابات المرتبطة يعتمد على موافقة الربط والصلاحيات التي يتيحها الحساب. راجع إعداد إذن قراءة المحادثات قبل تفعيله.'],
          [LifeBuoy, 'الإبلاغ والدعم', 'استخدم زر الدعم أو الإبلاغ عند مواجهة مشكلة أو سلوك غير مناسب. أرسل رقم الطلب أو رابط الصفحة ووصفًا مختصرًا، واحجب كلمات المرور والبيانات المالية.'],
        ].map(([Icon, title, text]) => { const SafetyIcon = Icon as typeof ShieldCheck; return <article key={title as string} className="flex gap-3 rounded-2xl border border-slate-100 p-4"><SafetyIcon className="mt-0.5 size-5 shrink-0 text-emerald-700" /><div><h3 className="font-extrabold text-slate-900">{title as string}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text as string}</p></div></article>; })}</div>
        <div className="mt-5 flex flex-wrap gap-3"><Link to="/privacy" className="btn btn-secondary">سياسة الخصوصية</Link><Link to="/terms" className="btn btn-secondary">الشروط وإخلاء المسؤولية</Link></div>
      </ContentSection>

      <ContentSection id="faq" eyebrow="10 · مساعدة سريعة" title="الأسئلة الشائعة" description="إجابات مختصرة عن أكثر الخطوات التي يحتاجها المستخدمون." icon={CircleHelp}>
        <div className="space-y-3">{questions.map(({ q, a }) => <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-4 open:border-cyan-200 open:bg-cyan-50/40"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold text-slate-900"><span>{q}</span><ChevronDown className="size-5 shrink-0 text-cyan-700 transition group-open:rotate-180" /></summary><p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-7 text-slate-600">{a}</p></details>)}</div>
      </ContentSection>

      <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-l from-cyan-700 to-sky-600 p-6 text-white shadow-xl shadow-cyan-200/60 sm:flex-row sm:items-center sm:p-8"><div><h2 className="text-xl font-black">ابدأ من القسم الذي تحتاجه</h2><p className="mt-2 text-sm leading-6 text-cyan-50">استكشف الخدمات، أو أنشئ حسابك، أو افتح الدعم إذا احتجت مساعدة.</p></div><div className="flex flex-wrap gap-3"><Link to="/services" className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-cyan-800 hover:bg-cyan-50">تصفح الخدمات</Link><Link to="/community" className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-white/10">المجتمع</Link></div></section>
    </div>
  </main>;
};
