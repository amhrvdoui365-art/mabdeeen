import { useEffect } from 'react';

export const useDocumentTitle = (title: string): void => {
  useEffect(() => {
    document.title = title ? `${title} | مبدعين (Mabdeen)` : 'مبدعين (Mabdeen) | منصة المبدعين والعملاء';
  }, [title]);
};
