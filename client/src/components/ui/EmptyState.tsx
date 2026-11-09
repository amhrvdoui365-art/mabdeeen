import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) => {
  return (
    <div
      className={
        compact
          ? 'relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-indigo-200 bg-linear-to-br from-indigo-50/80 via-white to-pink-50/70 px-4 py-8 text-center shadow-sm'
          : 'relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-indigo-200 bg-linear-to-br from-indigo-50/70 via-white to-pink-50/60 px-6 py-16 text-center shadow-card'
      }
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-pink-500 text-white shadow-lg shadow-violet-200/70 ring-4 ring-white/80">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};
