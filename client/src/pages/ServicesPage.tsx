import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, BriefcaseBusiness, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MediaViewer } from '@/components/common/MediaViewer';
import { PageLoader } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatPoints, formatDate } from '@/lib/utils';
import { servicesApi } from '@/services/services.service';
import type { MicroService } from '@/types';

const normalizeSearchText = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase('ar')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي');

const searchableText = (service: MicroService) => normalizeSearchText(
  [service.title, service.description, service.category, service.freelancerName].join(' '),
);

const ServiceCard = ({ service, allowRequest }: { service: MicroService; allowRequest: boolean }) => {
  const preview = service.media.find((media) => media.type === 'image' || media.type === 'video');

  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-cyan-100">
    {preview ? <MediaViewer url={preview.url} title={service.title} aspect="cover" className="rounded-none border-0 shadow-none" mediaClassName="max-h-72" /> : <div className="grid h-44 place-items-center bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-50 text-cyan-700"><BriefcaseBusiness className="size-10"/></div>}
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><span className="inline-flex max-w-full truncate rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">{service.category}</span><h2 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-slate-900">{service.title}</h2></div>
        <span className="shrink-0 rounded-2xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-800">{formatPoints(service.price)}</span>
      </div>
      <p className="mt-3 line-clamp-3 min-h-[4.5rem] whitespace-pre-wrap text-sm leading-6 text-slate-600">{service.description}</p>
      {service.sources.length ? <div className="mt-3 flex flex-wrap gap-2">{service.sources.slice(0, 3).map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800 hover:bg-cyan-100">{source.title}</a>)}{service.sources.length > 3 ? <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">+{service.sources.length - 3}</span> : null}</div> : null}
      <div className="mt-auto border-t border-slate-100 pt-4">
        <Link to={`/freelancers/${service.freelancerId}?serviceId=${encodeURIComponent(service.id)}`} className="flex min-w-0 items-center gap-3 rounded-2xl p-2 transition hover:bg-cyan-50">
          <Avatar name={service.freelancerName} src={service.freelancerAvatarUrl} className="size-11 rounded-xl"/>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-800">{service.freelancerName}</span><span className="mt-1 block text-xs text-slate-500">نُشرت في {formatDate(service.createdAt)}</span></span>
          <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition group-hover:border-cyan-200 group-hover:text-cyan-800">عرض الخدمة</span>
        </Link>
        {allowRequest ? <Link to={`/orders?serviceId=${encodeURIComponent(service.id)}`} className="btn btn-primary mt-3 w-full">اطلب الخدمة</Link> : null}
      </div>
    </div>
  </article>;
};

export const ServicesPage = () => {
  const { user } = useAuth();
  useDocumentTitle('خدمات المبدعين');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [sort, setSort] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const servicesQuery = useQuery({ queryKey: ['all-platform-services'], queryFn: servicesApi.listAll });
  const services = servicesQuery.data ?? [];
  const categories = useMemo(() => ['الكل', ...Array.from(new Set(services.map((item) => item.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar'))], [services]);
  const visibleServices = useMemo(() => {
    const terms = normalizeSearchText(search.trim()).split(/\s+/).filter(Boolean);
    return services.filter((service) => (category === 'الكل' || service.category.trim() === category) && terms.every((term) => searchableText(service).includes(term)))
      .sort((a, b) => sort === 'price-low' ? a.price - b.price || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : sort === 'price-high' ? b.price - a.price || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [services, search, category, sort]);

  return <div dir="rtl" className="min-h-[70vh] bg-slate-50">
    <section className="border-b border-cyan-100 bg-gradient-to-l from-cyan-50 via-white to-orange-50/70">
      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-4 py-2 text-xs font-extrabold text-cyan-800"><Sparkles className="size-4 text-orange-500"/>خدمات صُنعت بشغف</span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">خدمات المبدعين</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">اكتشف خدمات المستقلين المنشورة، وابحث حسب اسم الخدمة أو وصفها أو تصنيفها أو اسم المبدع.</p>
          <form className="mt-7 flex rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-cyan-100/60" role="search" onSubmit={(event) => event.preventDefault()}>
            <Search className="my-auto ms-3 size-5 shrink-0 text-slate-400"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="ابحث عن خدمة أو تصنيف أو مبدع..." aria-label="البحث في الخدمات" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"/>
            {search ? <button type="button" onClick={() => setSearch('')} className="rounded-xl px-3 text-sm font-bold text-cyan-800 hover:bg-cyan-50">مسح</button> : null}
          </form>
        </div>
      </div>
    </section>

    <section className="container-page py-8 sm:py-10">
      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-200/40 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-slate-800"><SlidersHorizontal className="size-4 shrink-0 text-cyan-700"/><span>التصنيفات الموجودة في خدمات المستقلين</span><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800">{visibleServices.length} خدمة</span></div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600"><ArrowUpDown className="size-4 text-slate-400"/><span>ترتيب حسب</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="input min-h-10 py-2"><option value="newest">الأحدث</option><option value="price-low">النقاط: الأقل أولاً</option><option value="price-high">النقاط: الأعلى أولاً</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{categories.map((item, index) => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${category === item ? 'border-cyan-700 bg-cyan-600 text-white shadow-md shadow-cyan-200' : ['border-violet-100 bg-violet-50 text-violet-800 hover:bg-violet-100', 'border-orange-100 bg-orange-50 text-orange-800 hover:bg-orange-100', 'border-lime-100 bg-lime-50 text-lime-800 hover:bg-lime-100', 'border-sky-100 bg-sky-50 text-sky-800 hover:bg-sky-100'][index % 4]}`}>{item === 'الكل' ? 'كل التصنيفات' : `#${item.replaceAll(' ', '_')}`}</button>)}</div>
      </div>

      {servicesQuery.isPending ? <PageLoader label="جارٍ تحميل خدمات المبدعين..."/> : servicesQuery.isError ? <ErrorState message="تعذر تحميل الخدمات الآن." onRetry={() => void servicesQuery.refetch()}/> : visibleServices.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} allowRequest={user?.role === 'Buyer' || !user}/>)}</div> : <EmptyState icon={BriefcaseBusiness} title={services.length ? 'لا توجد خدمات تطابق بحثك' : 'لا توجد خدمات منشورة بعد'} description={services.length ? 'غيّر عبارة البحث أو اختر تصنيفاً آخر لعرض النتائج.' : 'ستظهر هنا خدمات المستقلين فور نشرها.'} action={services.length ? <button type="button" onClick={() => { setSearch(''); setCategory('الكل'); }} className="btn btn-secondary">إعادة ضبط البحث والفلترة</button> : undefined}/>}
    </section>
  </div>;
};
