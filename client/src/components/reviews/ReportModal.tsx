import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { InlineLoader } from '@/components/ui/Spinner';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: (reason: string) => Promise<boolean>;
}

export const ReportModal = ({
  open,
  onClose,
  isSubmitting,
  onSubmit,
}: ReportModalProps) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (isSubmitting) {
      return;
    }

    setReason('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (reason.trim().length < 10) {
      setError('يرجى كتابة سبب واضح للبلاغ (10 أحرف على الأقل)');
      return;
    }

    const succeeded = await onSubmit(reason.trim());

    if (succeeded) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={close} title="الإبلاغ عن الحساب" size="sm">
      <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-800">
        استخدم هذا النموذج للإبلاغ عن بيانات غير صحيحة أو محتوى مخالف. سيتم مراجعة
        البلاغ من قبل الإدارة.
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="report-reason">
          سبب البلاغ
        </label>
        <textarea
          id="report-reason"
          rows={4}
          className="input resize-none"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setError(null);
          }}
          placeholder="اشرح المشكلة بالتفصيل..."
        />
        {error ? <p className="field-error">{error}</p> : null}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={close}>
          إلغاء
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={submit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <InlineLoader label="جارٍ الإرسال..." /> : (
            <>
              <Flag className="size-4" />
              إرسال البلاغ
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};
