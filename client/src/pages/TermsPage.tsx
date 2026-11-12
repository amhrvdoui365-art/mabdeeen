import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck, BookOpenCheck, LockKeyhole, Scale, Sparkles, UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const TERMS_SECTIONS: Array<{ id: string; title: string; icon: LucideIcon; summary: string; points: string[] }> = [
  {
    id: 'welcome', title: 'أهلًا بك في مبدعين', icon: BookOpenCheck,
    summary: 'مبدعين مساحة عربية مجانية وممتعة، يشارك فيها الناشئة من عمر 8 إلى 18 سنة مشاريعهم البرمجية والتصميمية، ويتعلمون ويطوّرون مهاراتهم بمشاركة الأسرة وإشرافها.',
    points: [
      'يسعدنا أن تكون جزءًا من مجتمع يشجع التعلّم والإبداع ومشاركة الأفكار.',
      'ساعد أسرتك في إعداد الحساب واستخدام الميزات المناسبة لك.',
    ],
  },
  {
    id: 'community', title: 'معًا نصنع مجتمعًا آمنًا ولطيفًا', icon: UserRound,
    summary: 'كلماتنا ومشاركاتنا تجعل مبدعين مكانًا أجمل للجميع. كن محترمًا، وراعِ خصوصيتك وخصوصية الآخرين.',
    points: [
      'عامل الجميع بلطف واحترام، ولا تنشر محتوى مؤذيًا أو مسيئًا أو غير مناسب للعمر.',
      'حافظ على أمانك: لا تنشر رقم الهاتف أو عنوان المنزل أو كلمات المرور أو أي معلومات شخصية حساسة.',
      'شارك مشاريعك وأعمالك التي أنجزتها، أو تأكد من حصولك على إذن قبل نشر أعمال الآخرين.',
    ],
  },
  {
    id: 'points', title: 'النقاط للتشجيع والإنجاز', icon: BadgeCheck,
    summary: 'النقاط داخل مبدعين وسيلة تشجيعية ومكافآت داخلية تساعد على إبراز الأنشطة والمشاريع.',
    points: [
      'استمتع بعرض إنجازاتك ومشاريعك ومتابعة نشاطك داخل المجتمع.',
      'النقاط مكافآت داخلية وليست نقودًا أو رصيدًا نقديًا.',
    ],
  },
];

export const TermsPage = () => {
  useDocumentTitle('شروط الاستخدام | مبدعين');

  return <main dir="rtl" className="container-page py-8 text-slate-800 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-l from-cyan-100/80 via-white to-sky-50 p-6 shadow-xl shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute -top-20 end-8 size-56 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-3 py-1.5 text-xs font-extrabold text-cyan-800"><Scale className="size-4" /> مجتمع مبدعين</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">شروط الاستخدام</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">أهلًا بك في مساحة التعلّم والإبداع! هذه مبادئ بسيطة تساعدنا على الاستمتاع بمشاركة المشاريع وبناء مجتمع آمن ولطيف.</p>
          <p className="mt-4 text-xs font-bold text-slate-500">معًا نتعلم ونبدع</p>
        </div>
      </header>

      <aside className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 sm:p-5"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 shrink-0 text-cyan-700" /><div><h2 className="font-extrabold text-cyan-950">أفكار بسيطة لمجتمع أجمل</h2><p className="mt-1 text-sm leading-7 text-cyan-950/85">كن لطيفًا، حافظ على خصوصيتك، وشارك أعمالك بأمانة. بمساعدة الأسرة وإشرافها، تصبح رحلتك في مبدعين أكثر متعة وأمانًا!</p></div></div></aside>

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav aria-label="أقسام شروط الاستخدام" className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24"><h2 className="font-extrabold text-slate-900">محتويات الصفحة</h2><ol className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">{TERMS_SECTIONS.map((section) => <li key={section.id}><a href={`#${section.id}`} className="block rounded-lg px-3 py-2 text-xs font-bold leading-5 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-900">{section.title}</a></li>)}</ol></nav>
        <div className="min-w-0 space-y-4">{TERMS_SECTIONS.map(({ id, title, icon: Icon, summary, points }) => <section id={id} key={id} className="scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-800"><Icon className="size-5" /></span><div className="min-w-0"><h2 className="text-base font-black text-slate-900 sm:text-lg">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{summary}</p></div></div><ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">{points.map((point) => <li key={point} className="flex gap-2 text-sm leading-7 text-slate-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-600" />{point}</li>)}</ul></section>)}

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"><h2 className="font-extrabold text-slate-900">صفحات مرتبطة</h2><div className="mt-3 flex flex-wrap gap-3"><Link to="/privacy" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm hover:bg-cyan-50"><LockKeyhole className="size-4" />سياسة الخصوصية</Link><Link to="/guide" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm hover:bg-cyan-50"><BookOpenCheck className="size-4" />دليل استخدام المنصة</Link><Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm hover:bg-cyan-50"><BadgeCheck className="size-4" />العودة للرئيسية</Link></div></section>
        </div>
      </div>
    </div>
  </main>;
};
