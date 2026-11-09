import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/** Adds route scoped entrance and pointer motion without owning page state. */
export const PageMotion = ({ routeKey, children }: { routeKey: string; children: ReactNode }) => {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP((_, contextSafe) => {
    const region = scope.current;
    if (!region || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const items = region.querySelectorAll<HTMLElement>('.card, article, [data-motion="card"]');
    if (items.length) {
      gsap.fromTo(items, { autoAlpha: 0, y: 16, scale: 0.985 }, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.55,
        stagger: 0.055,
        ease: 'power3.out',
        clearProps: 'transform,opacity,visibility',
      });
    }

    const enter = (event: Event) => {
      gsap.to(event.currentTarget, { y: -3, scale: 1.006, duration: 0.22, ease: 'power2.out', overwrite: true });
    };
    const leave = (event: Event) => {
      gsap.to(event.currentTarget, { y: 0, scale: 1, duration: 0.28, ease: 'power2.out', overwrite: true });
    };
    const onEnter = contextSafe ? contextSafe(enter) : enter;
    const onLeave = contextSafe ? contextSafe(leave) : leave;
    items.forEach((item) => {
      item.addEventListener('pointerenter', onEnter);
      item.addEventListener('pointerleave', onLeave);
    });

    return () => items.forEach((item) => {
      item.removeEventListener('pointerenter', onEnter);
      item.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(item);
    });
  }, { scope, dependencies: [routeKey], revertOnUpdate: true });

  return <div ref={scope} className="min-w-0">{children}</div>;
};
