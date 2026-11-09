import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const closeTweensRef = useRef<gsap.core.Tween[]>([]);

  const handleClose = useCallback(() => {
    if (!open || closingRef.current) return;
    closingRef.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !panelRef.current) {
      onClose();
      return;
    }
    closeTweensRef.current.forEach((tween) => tween.kill());
    closeTweensRef.current = [
      gsap.to(panelRef.current, { autoAlpha: 0, y: 8, scale: 0.99, duration: 0.18, ease: 'power2.in' }),
      gsap.to(overlayRef.current, { autoAlpha: 0, duration: 0.18, ease: 'power1.out', onComplete: onClose }),
    ];
  }, [onClose, open]);

  useGSAP(() => {
    if (!open || !panelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(panelRef.current, { autoAlpha: 0, y: 14, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' });
  }, { dependencies: [open], revertOnUpdate: true });

  useEffect(() => () => closeTweensRef.current.forEach((tween) => tween.kill()), []);

  useEffect(() => {
    if (!open) {
      return;
    }
    closingRef.current = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, handleClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-2 backdrop-blur-xl animate-fade-in sm:p-4"
      onMouseDown={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        className={cn(
          'my-auto flex max-h-[calc(100vh-1rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-2xl backdrop-blur-xl sm:max-h-[90vh] sm:rounded-3xl [@supports(height:100dvh)]:max-h-[calc(100dvh-1rem)] sm:[@supports(height:100dvh)]:max-h-[90dvh]',
          SIZES[size],
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="min-w-0 flex-1 pe-3 text-base font-extrabold text-slate-900 sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
