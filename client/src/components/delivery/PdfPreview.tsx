import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

GlobalWorkerOptions.workerSrc = workerUrl;

const PageCanvas = ({ doc, pageNumber, zoom = 1 }: { doc: PDFDocumentProxy; pageNumber: number; zoom?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setBox((current) => {
      const width = Math.floor(element.clientWidth);
      const height = Math.floor(element.clientHeight);
      return current.width === width && current.height === height ? current : { width, height };
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!box.width || !box.height) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    setReady(false);
    setFailed(false);
    doc.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(box.width / base.width, box.height / base.height) * ratio * zoom;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      // PDF glyph positions are absolute; inherited RTL shifts each glyph away from its intended origin.
      context.direction = 'ltr';
      context.textAlign = 'left';
      task = page.render({ canvasContext: context, viewport });
      return task.promise.then(() => { if (!cancelled) setReady(true); });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; task?.cancel(); };
  }, [box, doc, pageNumber, zoom]);

  return (
    <div ref={containerRef} className="relative flex size-full items-center justify-center overflow-auto p-3 sm:p-5">
      <canvas ref={canvasRef} dir="ltr" aria-label={`صفحة PDF ${pageNumber}`} className={`shrink-0 shadow-xl transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {failed ? <span role="alert" className="absolute text-xs text-rose-600">تعذرت معاينة هذه الصفحة.</span> : !ready ? <span className="absolute text-xs text-slate-400">جارٍ تجهيز معاينة PDF…</span> : null}
    </div>
  );
};

const PageControls = ({ pageNumber, total, onChange }: {
  pageNumber: number;
  total: number;
  onChange: (page: number) => void;
}) => (
  <div dir="ltr" className="flex items-center justify-center gap-2 text-[11px] font-bold text-white">
    <button type="button" aria-label="الصفحة السابقة" disabled={pageNumber <= 1} onClick={() => onChange(Math.max(1, pageNumber - 1))} className="grid size-9 place-items-center rounded-lg hover:bg-white/15 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
    <span>{pageNumber} / {total}</span>
    <button type="button" aria-label="الصفحة التالية" disabled={pageNumber >= total} onClick={() => onChange(Math.min(total, pageNumber + 1))} className="grid size-9 place-items-center rounded-lg hover:bg-white/15 disabled:opacity-40"><ChevronRight className="size-4" /></button>
  </div>
);

export const PdfPreview = ({ blob, title, className }: { blob: Blob; title: string; className?: string }) => {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    setDoc(null);
    setFailed(false);
    setPageNumber(1);
    setZoom(1);
    setExpanded(false);
    // CSP connect-src is 'self', so pdf.js cannot fetch a blob: URL; feed it the fetched bytes instead.
    blob.arrayBuffer().then((buffer) => {
      if (cancelled) return;
      const task = getDocument({ data: new Uint8Array(buffer) });
      loadingTask = task;
      return task.promise.then((pdf) => {
        if (cancelled) { void pdf.destroy(); return; }
        setDoc(pdf);
      });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [blob]);

  useEffect(() => {
    if (!expanded || !doc) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
      }
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [expanded, doc]);

  useEffect(() => {
    if (expanded) setZoom(1.5);
  }, [expanded]);

  const total = doc?.numPages ?? 0;

  if (failed) return <div className={`grid place-items-center bg-slate-50 text-xs text-rose-600 ${className ?? ''}`}>تعذرت معاينة ملف PDF.</div>;

  return (
    <>
      <div onContextMenu={(event) => event.preventDefault()} className={`relative flex flex-col overflow-hidden bg-slate-200 ${className ?? ''}`}>
        <div className="min-h-0 flex-1">
          {doc && !expanded ? <PageCanvas doc={doc} pageNumber={pageNumber} /> : <div className="grid size-full place-items-center bg-slate-50 text-xs text-slate-400">{expanded ? 'المعاينة مفتوحة بالحجم الكامل' : 'جارٍ تجهيز معاينة PDF…'}</div>}
        </div>
        <button type="button" onClick={() => setExpanded(true)} disabled={!doc || expanded} aria-label="فتح معاينة PDF بالحجم الكامل" className="absolute end-2 top-2 z-10 flex size-9 items-center justify-center rounded-lg bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-900/80 disabled:opacity-40"><Maximize2 className="size-4" /></button>
        {total > 1 && !expanded ? <div className="shrink-0 bg-slate-900/60 py-1"><PageControls pageNumber={pageNumber} total={total} onChange={setPageNumber} /></div> : null}
      </div>
      {expanded && doc ? createPortal(
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`معاينة ${title}`} dir="rtl" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpanded(false); }} onContextMenu={(event) => event.preventDefault()} className="fixed inset-0 z-[230] flex flex-col bg-slate-950/95 p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white shadow-lg backdrop-blur sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-300"><span className="text-[10px] font-black">PDF</span></span>
              <div className="min-w-0"><p className="truncate text-xs font-extrabold sm:text-sm">{title}</p><p className="mt-0.5 text-[10px] text-white/55">صفحة {pageNumber} من {total}</p></div>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1" dir="ltr" aria-label="أدوات تكبير المعاينة">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.75, Math.round((value - 0.25) * 100) / 100))} disabled={zoom <= 0.75} aria-label="تصغير الصفحة" title="تصغير" className="grid size-9 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-35"><Minus className="size-4" /></button>
              <span className="min-w-12 text-center text-[11px] font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, Math.round((value + 0.25) * 100) / 100))} disabled={zoom >= 3} aria-label="تكبير الصفحة" title="تكبير" className="grid size-9 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-35"><Plus className="size-4" /></button>
              <span className="mx-1 h-5 w-px bg-white/15" />
              <button type="button" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="ملاءمة الصفحة للشاشة" title="ملاءمة الصفحة" className="grid size-9 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-35"><RotateCcw className="size-4" /></button>
            </div>
            <button type="button" onClick={() => setExpanded(false)} aria-label="إغلاق المعاينة" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"><X className="size-5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-800/70 shadow-inner"><PageCanvas doc={doc} pageNumber={pageNumber} zoom={zoom} /></div>
          {total > 1 ? <div className="mt-3 flex justify-center"><div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1"><PageControls pageNumber={pageNumber} total={total} onChange={setPageNumber} /></div></div> : null}
        </div>,
        document.body,
      ) : null}
    </>
  );
};
