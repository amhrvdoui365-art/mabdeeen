import { Cloud, ExternalLink, FileText, Globe2, ImageOff, Loader2, Maximize2, Music2, PlayCircle, RefreshCw, ShieldAlert, ShieldCheck, Video, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { resolveLinkPreview, type LinkPreview as ResolvedLink, type PreviewProvider } from '@/lib/link-preview';
import type { Role } from '@/types';

const TRUSTED_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation';
const SITE_SANDBOX = 'allow-scripts allow-forms allow-presentation';
const FRAME_ALLOW = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
const LOAD_TIMEOUT_MS = 12_000;

const PROVIDER_META: Record<PreviewProvider | 'media', { label: string; icon: LucideIcon; tone: string }> = {
  youtube: { label: 'YouTube', icon: PlayCircle, tone: 'bg-rose-50 text-rose-600 ring-rose-100' },
  vimeo: { label: 'Vimeo', icon: PlayCircle, tone: 'bg-sky-50 text-sky-600 ring-sky-100' },
  drive: { label: 'Google Drive', icon: Cloud, tone: 'bg-amber-50 text-amber-700 ring-amber-100' },
  docs: { label: 'Google Docs', icon: FileText, tone: 'bg-blue-50 text-blue-700 ring-blue-100' },
  loom: { label: 'Loom', icon: Video, tone: 'bg-violet-50 text-violet-700 ring-violet-100' },
  website: { label: 'موقع خارجي', icon: Globe2, tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  media: { label: 'وسائط مباشرة', icon: PlayCircle, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
};

const mediaMeta = (preview: Extract<ResolvedLink, { kind: 'media' }>) =>
  preview.mediaType === 'audio' ? { icon: Music2, tone: 'bg-amber-50 text-amber-700 ring-amber-100' }
    : preview.mediaType === 'image' ? { icon: FileText, tone: 'bg-teal-50 text-teal-700 ring-teal-100' }
      : { icon: Video, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };

const frameSandbox = (preview: Extract<ResolvedLink, { kind: 'frame' }>): string =>
  preview.provider === 'website' ? SITE_SANDBOX : TRUSTED_SANDBOX;

const originalLink = (preview: ResolvedLink): string =>
  preview.kind === 'frame' ? preview.originalUrl : preview.url;

const displayAddress = (link: string): string => {
  try {
    const url = new URL(link);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return link;
  }
};

const StatusDot = ({ state }: { state: 'loading' | 'ready' | 'blocked' }) => (
  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${state === 'ready' ? 'bg-emerald-500' : state === 'blocked' ? 'bg-rose-500' : 'animate-pulse bg-amber-500'}`} />
);

const OpenExternal = ({ link, label = 'فتح في نافذة جديدة', className }: { link: string; label?: string; className?: string }) => (
  <a href={link} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className ?? 'inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 text-[10px] font-extrabold text-white transition hover:bg-slate-800'}>
    <ExternalLink className="size-3.5" />{label}
  </a>
);

const BlockedCard = ({ link, title, onRetry, compact = false }: { link: string; title: string; onRetry: () => void; compact?: boolean }) => (
  <div className={`relative flex size-full flex-col items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 via-white to-indigo-50/70 px-4 text-center ${compact ? 'py-3' : 'py-5'}`}>
    <span aria-hidden className="pointer-events-none absolute -end-6 -top-6 size-24 rounded-full bg-indigo-200/30 blur-2xl" />
    <span className="grid size-10 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"><ShieldAlert className="size-5" /></span>
    <p className="mt-2 text-xs font-extrabold text-slate-800">تعذّر عرض الموقع داخل المنصة</p>
    <p className="mt-1 max-w-md text-[10px] leading-4 text-slate-500">الموقع يمنع التضمين عبر إعدادات الحماية (X-Frame-Options أو CSP) أو يحتاج تسجيل دخول. المحتوى نفسه سليم، ويمكنك فتحه في نافذة آمنة.</p>
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <OpenExternal link={link} label="فتح الموقع بأمان" />
      <button type="button" onClick={onRetry} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-extrabold text-slate-600 transition hover:bg-slate-50"><RefreshCw className="size-3.5" />إعادة المحاولة</button>
    </div>
    <p className="mt-2 max-w-full truncate text-[9px] text-slate-400" title={`${title} — ${displayAddress(link)}`}>{displayAddress(link)}</p>
  </div>
);

export const LinkPreview = ({ sourceUrl, title, locked = false, viewerRole, className = 'h-60' }: {
  sourceUrl: string;
  title: string;
  locked?: boolean;
  viewerRole?: Role;
  className?: string;
}) => {
  const [state, setState] = useState<'loading' | 'ready' | 'blocked'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [forceFallback, setForceFallback] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const preview = resolveLinkPreview(sourceUrl);
  const isFrame = preview?.kind === 'frame';
  const embedKey = preview ? originalLink(preview) : sourceUrl;
  const blocked = forceFallback || state === 'blocked' || mediaFailed;

  useEffect(() => {
    setState('loading');
    setForceFallback(false);
    setMediaFailed(false);
  }, [embedKey, attempt]);

  useEffect(() => {
    if (!isFrame || state !== 'loading') return;
    const timer = window.setTimeout(() => setState((current) => current === 'loading' ? 'blocked' : current), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isFrame, embedKey, state, attempt]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button[aria-label="إغلاق المعاينة"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled), a[href]');
      if (!buttons?.length) return;
      const first = buttons[0] as HTMLElement;
      const last = buttons[buttons.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (expandButtonRef.current) expandButtonRef.current.focus({ preventScroll: true });
    };
  }, [expanded]);

  if (!preview) {
    return <div className={`grid place-items-center bg-linear-to-br from-slate-50 to-indigo-50/60 p-4 text-center ${className}`}>
      <div><ImageOff className="mx-auto size-6 text-slate-400" /><p className="mt-2 text-xs font-bold text-slate-600">تعذر قراءة هذا الرابط.</p><p className="mt-1 text-[10px] text-slate-500">تأكد أنه رابط عام يبدأ بـ https://</p></div>
    </div>;
  }

  const link = originalLink(preview);
  const meta = preview.kind === 'frame' ? PROVIDER_META[preview.provider] : { label: PROVIDER_META.media.label, ...mediaMeta(preview) };
  const ProviderIcon = meta.icon;
  const note = viewerRole === 'Freelancer'
    ? 'أنت تعرض رابطًا شاركته: تأكد أن الموقع يسمح بالتضمين (X-Frame-Options / CSP) وأن الصفحات والوسائط عامة، لأن المحتوى المحمي بتسجيل الدخول لن يظهر للعميل.'
    : 'تصفح العمل داخل المنصة مباشرة. لو ظهرت الصفحة فارغة فالموقع يمنع التضمين أو يطلب تسجيل دخول؛ استخدم زر الفتح الآمن.';
  const retry = () => setAttempt((value) => value + 1);
  const block = locked ? (event: SyntheticEvent) => event.preventDefault() : undefined;

  const media = preview.kind === 'media' ? <div className="size-full">
    {mediaFailed ? <BlockedCard link={link} title={title} onRetry={retry} compact /> : preview.mediaType === 'image'
      ? <img src={preview.url} alt={title} draggable={false} onError={() => setMediaFailed(true)} onContextMenu={block} className="size-full bg-slate-950 object-contain" />
      : preview.mediaType === 'audio'
        ? <div className="grid size-full place-items-center bg-slate-900/95 p-4"><audio src={preview.url} controls controlsList="nodownload" onError={() => setMediaFailed(true)} onContextMenu={block} className="w-full" /></div>
        : <video src={preview.url} controls controlsList="nodownload" disablePictureInPicture playsInline onError={() => setMediaFailed(true)} onContextMenu={block} className="size-full bg-black object-contain" />}
  </div> : null;

  const frame = preview.kind === 'frame' && !blocked ? <div className="relative size-full bg-white">
    <iframe
      key={`${preview.embedUrl}-${attempt}`}
      src={preview.embedUrl}
      title={`معاينة ${preview.label}: ${title}`}
      sandbox={frameSandbox(preview)}
      referrerPolicy="strict-origin-when-cross-origin"
      allow={FRAME_ALLOW}
      allowFullScreen
      loading="lazy"
      onLoad={() => setState('ready')}
      onError={() => setState('blocked')}
      className="size-full border-0"
    />
    {state === 'loading' ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[2px]"><span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200"><Loader2 className="size-3.5 animate-spin text-indigo-500" />جارٍ تحميل المعاينة…</span></div> : null}
  </div> : null;

  const body = media ?? frame ?? <BlockedCard link={link} title={title} onRetry={() => { setForceFallback(false); retry(); }} compact />;

  const shell = (fullscreen: boolean) => <div className={`flex min-h-0 w-full flex-col overflow-hidden ${fullscreen ? 'size-full rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-2xl' : `rounded-2xl border border-white/80 bg-white/70 shadow-[0_12px_35px_-18px_rgba(49,46,129,0.45)] ring-1 ring-slate-900/5 backdrop-blur-xl ${className}`}`}>
    <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2 ${fullscreen ? 'border-white/10 bg-white/5' : 'border-white/70 bg-white/55'}`}>
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ring-1 ${meta.tone}`}><ProviderIcon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className={`flex items-center gap-1.5 truncate text-[10px] font-extrabold ${fullscreen ? 'text-white' : 'text-slate-800'}`}><StatusDot state={blocked ? 'blocked' : state} />{meta.label}<span className={`truncate font-semibold ${fullscreen ? 'text-white/50' : 'text-slate-400'}`} dir="ltr">{displayAddress(link)}</span></p>
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer" aria-label="فتح الرابط الأصلي في نافذة جديدة" title="فتح الرابط الأصلي" className={`grid size-8 shrink-0 place-items-center rounded-lg transition ${fullscreen ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-white hover:text-indigo-700'}`}><ExternalLink className="size-4" /></a>
      <button ref={fullscreen ? undefined : expandButtonRef} type="button" onClick={() => setExpanded(true)} disabled={fullscreen} aria-label="فتح معاينة الرابط بالحجم الكامل" title="تكبير المعاينة" className={`grid size-8 shrink-0 place-items-center rounded-lg transition disabled:hidden ${fullscreen ? 'text-white/70' : 'text-slate-500 hover:bg-white hover:text-indigo-700'}`}><Maximize2 className="size-4" /></button>
      {fullscreen ? <button type="button" onClick={() => setExpanded(false)} aria-label="إغلاق المعاينة" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"><X className="size-5" /></button> : null}
    </div>
    <div className="min-h-0 flex-1 bg-white/40">{fullscreen && expanded && preview.kind === 'frame' && !blocked ? frame : fullscreen ? body : (expanded ? <div className="grid size-full place-items-center bg-slate-50 text-[10px] text-slate-400">المعاينة مفتوحة بالحجم الكامل</div> : body)}</div>
    {preview.kind === 'frame' && preview.provider === 'website' ? <div className={`shrink-0 border-t px-3 py-1.5 ${fullscreen ? 'border-white/10' : 'border-white/70 bg-white/50'}`}>
      <p className={`flex items-start gap-1.5 text-[9px] leading-4 ${fullscreen ? 'text-white/60' : 'text-slate-500'}`}><ShieldCheck className="mt-px size-3 shrink-0 text-indigo-500" /><span>{note} {!blocked ? <button type="button" onClick={() => setForceFallback(true)} className={`font-extrabold underline decoration-dotted underline-offset-2 ${fullscreen ? 'text-white/80' : 'text-indigo-600'}`}>المعاينة لا تعمل؟</button> : null}</span></p>
    </div> : null}
  </div>;

  return <>
    {shell(false)}
    {expanded ? createPortal(
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`معاينة ${title}`} dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpanded(false); }} className="fixed inset-0 z-[230] flex flex-col bg-slate-950/90 p-2 backdrop-blur-md sm:p-5">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
          <p className="mb-2 truncate px-1 text-xs font-bold text-white sm:text-sm">{title}</p>
          <div className="min-h-0 flex-1">{shell(true)}</div>
        </div>
      </div>,
      document.body,
    ) : null}
  </>;
};
