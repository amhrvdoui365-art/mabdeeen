import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

GlobalWorkerOptions.workerSrc = workerUrl;

const PageCanvas = ({ doc, pageNumber }: { doc: PDFDocumentProxy; pageNumber: number }) => {
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
    doc.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const base = page.getViewport({ scale: 1 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(box.width / base.width, box.height / base.height) * ratio;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.style.width = `${viewport.width / ratio}px`;
      canvas.style.height = `${viewport.height / ratio}px`;
      task = page.render({ canvasContext: context, viewport });
      return task.promise.then(() => { if (!cancelled) setReady(true); });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; task?.cancel(); };
  }, [box, doc, pageNumber]);

  if (failed) return <div className="grid size-full place-items-center text-xs text-rose-600">تعذرت معاينة ملف PDF.</div>;
  return (
    <div ref={containerRef} className="relative grid size-full place-items-center overflow-hidden">
      <canvas ref={canvasRef} aria-label="صفحة PDF" className={`max-h-full max-w-full shadow-sm transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {!ready ? <span className="absolute text-xs text-slate-400">جارٍ تجهيز معاينة PDF…</span> : null}
    </div>
  );
};

const PageControls = ({ pageNumber, total, onChange }: {
  pageNumber: number;
  total: number;
  onChange: (page: number) => void;
}) => (
  <div dir="ltr" className="flex items-center justify-center gap-2 text-[11px] font-bold text-white">
    <button type="button" aria-label="الصفحة السابقة" disabled={pageNumber <= 1} onClick={() => onChange(Math.max(1, pageNumber - 1))} className="rounded p-0.5 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
    <span>{pageNumber} / {total}</span>
    <button type="button" aria-label="الصفحة التالية" disabled={pageNumber >= total} onClick={() => onChange(Math.min(total, pageNumber + 1))} className="rounded p-0.5 disabled:opacity-40"><ChevronRight className="size-4" /></button>
  </div>
);

export const PdfPreview = ({ blob, title, className }: { blob: Blob; title: string; className?: string }) => {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const loadingTask = useRef<PDFDocumentLoadingTask | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setFailed(false);
    setPageNumber(1);
    // CSP connect-src is 'self', so pdf.js cannot fetch a blob: URL; feed it the fetched bytes instead.
    blob.arrayBuffer().then((buffer) => {
      if (cancelled) return;
      const task = getDocument({ data: new Uint8Array(buffer) });
      loadingTask.current = task;
      return task.promise.then((pdf) => {
        if (cancelled) { void pdf.destroy(); return; }
        setDoc(pdf);
      });
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      void loadingTask.current?.destroy();
      loadingTask.current = null;
    };
  }, [blob]);

  const total = doc?.numPages ?? 0;

  if (failed) return <div className={`grid place-items-center bg-slate-50 text-xs text-rose-600 ${className ?? ''}`}>تعذرت معاينة ملف PDF.</div>;

  return (
    <>
      <div onContextMenu={(event) => event.preventDefault()} className={`relative overflow-hidden bg-slate-200 ${className ?? ''}`}>
        {doc && !expanded ? <PageCanvas doc={doc} pageNumber={pageNumber} /> : <div className="grid size-full place-items-center bg-slate-50 text-xs text-slate-400">جارٍ تجهيز معاينة PDF…</div>}
        <button type="button" onClick={() => setExpanded(true)} aria-label="فتح معاينة PDF بالحجم الكامل" className="absolute end-2 top-2 z-10 flex size-9 items-center justify-center rounded-lg bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-900/80"><Maximize2 className="size-4" /></button>
        {total > 1 ? <div className="absolute inset-x-0 bottom-0 z-10 bg-slate-900/60 py-1"><PageControls pageNumber={pageNumber} total={total} onChange={setPageNumber} /></div> : null}
      </div>
      {expanded && doc ? (
        <div role="dialog" aria-modal="true" aria-label={`معاينة ${title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setExpanded(false); }} onContextMenu={(event) => event.preventDefault()} className="fixed inset-0 z-[230] flex flex-col bg-slate-950/95 p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 text-white">
            <p className="truncate text-xs font-bold sm:text-sm">{title}</p>
            <button type="button" onClick={() => setExpanded(false)} aria-label="إغلاق المعاينة" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15"><X className="size-5" /></button>
          </div>
          <div className="min-h-0 flex-1"><PageCanvas doc={doc} pageNumber={pageNumber} /></div>
          {total > 1 ? <div className="mt-3"><PageControls pageNumber={pageNumber} total={total} onChange={setPageNumber} /></div> : null}
        </div>
      ) : null}
    </>
  );
};
