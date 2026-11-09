import { LockKeyhole, Database, Eye, ShieldCheck } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const items = [
  { icon: Database, title: 'البيانات التي نستخدمها', text: 'نستخدم بيانات الحساب والملف الشخصي والمحادثات ومرفقاتها وسجلات التسليم والنقاط اللازمة لتشغيل المنصة وحماية الحسابات وتحسين الخدمة.' },
  { icon: Eye, title: 'الظهور والمشاركة', text: 'تظهر بيانات الملف التي تختار نشرها للزوار. تُتاح المحادثات وملفات المشروع للمشاركين المصرح لهم، ويُستخدم مزودو الاستضافة والتشغيل بالقدر اللازم لتقديم الخدمة.' },
  { icon: LockKeyhole, title: 'الملفات الخاصة', text: 'تخزن ملفات التسليم في مساحة خاصة وتُعرض عبر مسارات تتحقق من صلاحية المستخدم. يظل التنزيل مقفلاً للعميل قبل قبول التسليم. المعاينة داخل المنصة لا تمنع تصوير الشاشة أو إعادة النسخ.' },
  { icon: ShieldCheck, title: 'الأمان والاحتفاظ', text: 'نطبق ضوابط وصول تقنية ونحد من استخدام البيانات إلى أغراض الخدمة والأمان. قد نحتفظ بالسجلات ما دامت لازمة لتشغيل المنصة أو معالجة النزاعات والمتطلبات النظامية، ونراجع طلبات الخصوصية عبر قنوات الدعم.' },
];

export const PrivacyPage = () => {
  useDocumentTitle('سياسة الخصوصية');
  return <main className="container-page py-10 sm:py-14"><div className="mx-auto max-w-4xl"><header className="rounded-3xl border border-sky-100 bg-gradient-to-l from-sky-50 via-white to-indigo-50 p-6 shadow-xl sm:p-9"><span className="text-xs font-bold text-sky-700">خصوصيتك وأمان بياناتك</span><h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">سياسة الخصوصية</h1><p className="mt-3 text-sm leading-7 text-slate-600">توضح هذه الصفحة البيانات التي تحتاجها منصة سالكة لتشغيل الحسابات والتواصل والتسليم الآمن.</p></header><div className="mt-6 space-y-4">{items.map(({ icon: Icon, title, text }) => <section key={title} className="card flex min-w-0 gap-4 p-5 sm:p-6"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Icon className="size-5" /></span><div className="min-w-0"><h2 className="font-extrabold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></div></section>)}</div><p className="mt-5 text-xs leading-6 text-slate-500">قد تتغير هذه السياسة عند تحديث الخدمة، ويُعرض الإصدار الساري هنا. للتواصل بشأن الخصوصية، استخدم الدعم الفني داخل المنصة.</p></div></main>;
};
