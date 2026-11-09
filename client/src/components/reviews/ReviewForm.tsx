import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { InlineLoader } from '@/components/ui/Spinner';
import { StarInput } from '@/components/ui/StarRating';
import { reviewSchema, type ReviewFormValues } from '@/lib/validation';

interface ReviewFormProps {
  isSubmitting: boolean;
  onSubmit: (values: ReviewFormValues) => Promise<boolean>;
}

export const ReviewForm = ({ isSubmitting, onSubmit }: ReviewFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      clientName: '',
      rating: 5,
      comment: '',
    },
  });

  const rating = watch('rating');

  const submit = handleSubmit(async (values) => {
    const succeeded = await onSubmit(values);

    if (succeeded) {
      reset({ clientName: '', rating: 5, comment: '' });
    }
  });

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <h3 className="text-base font-extrabold text-slate-900">شارك تجربتك</h3>
      <p className="mt-1 text-xs leading-6 text-slate-500">
        احكِ للآخرين عن تجربة التعامل مع هذا المستقل. التقييمات تساعد في بناء الثقة.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="reviewer-name">
            اسمك
          </label>
          <input
            id="reviewer-name"
            className="input"
            placeholder="مثال: أحمد محمد"
            {...register('clientName')}
          />
          {errors.clientName ? (
            <p className="field-error">{errors.clientName.message}</p>
          ) : null}
        </div>

        <div>
          <span className="label">التقييم</span>
          <StarInput
            value={rating}
            onChange={(value) => setValue('rating', value, { shouldValidate: true })}
          />
          {errors.rating ? <p className="field-error">{errors.rating.message}</p> : null}
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="reviewer-comment">
          تعليقك (اختياري)
        </label>
        <textarea
          id="reviewer-comment"
          rows={3}
          className="input resize-none"
          placeholder="كيف كانت تجربة العمل معه؟"
          {...register('comment')}
        />
        {errors.comment ? (
          <p className="field-error">{errors.comment.message}</p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary mt-4" disabled={isSubmitting}>
        {isSubmitting ? <InlineLoader label="جارٍ الإرسال..." /> : (
          <>
            <Send className="size-4" />
            إضافة التقييم
          </>
        )}
      </button>
    </form>
  );
};
