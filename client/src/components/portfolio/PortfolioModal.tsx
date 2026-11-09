import { Code2, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { PortfolioItem } from '@/types';
import { sanitizeText } from '@/lib/sanitize';

export const PortfolioModal = ({
  item,
  onClose,
}: {
  item: PortfolioItem | null;
  onClose: () => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item?.id]);

  if (!item) {
    return null;
  }

  const showImage = Boolean(item.imageUrl) && !imageFailed;

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item.title} size="lg">
      <div className="overflow-hidden rounded-2xl bg-slate-100">
        {showImage ? (
          <img
            src={item.imageUrl ?? undefined}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="max-h-[60vh] w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center text-brand-700/70">
            <FolderOpen className="size-12" />
            <span className="text-sm font-bold">معاينة المشروع</span>
            {item.imageUrl && imageFailed ? (
              <>
                <span className="max-w-sm text-xs font-semibold leading-6 text-slate-500">
                  تعذر تحميل الصورة من رابطها الخارجي. قد يكون الرابط غير مباشر أو
                  الموقع يمنع العرض خارج صفحاته.
                </span>
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-700 underline underline-offset-4"
                >
                  فتح رابط الصورة
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>

      {item.description ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
          {sanitizeText(item.description)}
        </p>
      ) : null}

      {item.projectUrl ? (
        <a
          href={item.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary mt-5"
        >
          <Code2 className="size-4" />
          فتح GitHub
        </a>
      ) : null}
    </Modal>
  );
};
