import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { parentApi } from '@/services/parent.service';
import { getErrorMessage } from '@/services/api';

export const ParentVerifyPage = () => {
  const { token = '' } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [cameraError, setCameraError] = useState('');
  const info = useQuery({ queryKey: ['parent-verification', token], queryFn: () => parentApi.verificationInfo(token), enabled: Boolean(token), retry: false });
  const submit = useMutation({ mutationFn: () => parentApi.submitVerification(token, Number(answer), photo!), onSuccess: () => { streamRef.current?.getTracks().forEach((track) => track.stop()); setStreamReady(false); }, onError: (error) => setCameraError(getErrorMessage(error, 'تعذر إرسال طلب التحقق')) });
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => { if (streamReady && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current; }, [streamReady]);
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setStreamReady(true);
    } catch { setCameraError('لم نتمكن من فتح الكاميرا. اسمح باستخدامها ثم حاول مرة أخرى.'); }
  };
  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => { if (!blob) return; setPhoto(blob); setPhotoUrl(URL.createObjectURL(blob)); streamRef.current?.getTracks().forEach((track) => track.stop()); setStreamReady(false); }, 'image/jpeg', 0.88);
  };
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); if (photo && answer !== '') submit.mutate(); };

  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-orange-50 px-4 py-10"><section className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-cyan-100/60 sm:p-9"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><ShieldCheck className="size-7"/></div><h1 className="mt-4 text-center text-2xl font-black text-slate-900">توثيق ولي الأمر</h1>{info.isPending ? <p className="mt-8 text-center text-slate-500">جارٍ التحقق من الرابط…</p> : info.isError ? <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-center font-bold text-rose-700">رابط التحقق غير صالح أو انتهت صلاحيته.</div> : submit.isSuccess ? <div className="mt-7 rounded-2xl bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-600"/><h2 className="mt-3 font-black text-emerald-800">وصل طلبك للإدارة</h2><p className="mt-2 text-sm leading-6 text-emerald-700">ستراجع الإدارة صورة ولي الأمر وإجابة التحدي، ثم ترسل نتيجة المراجعة.</p></div> : info.data ? <><p className="mt-3 text-center leading-7 text-slate-600">أرسل ولي أمر <strong>{info.data.childName}</strong> طلب توثيق. التقط صورة مباشرة وأجب عن المسألة لإرسال الطلب للمراجعة.</p><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">الصورة تُرسل بشكل خاص لمراجعة الإدارة، ولا ينفذ النظام تعرّفًا آليًا على الوجه.</p><div className="mt-5 overflow-hidden rounded-2xl bg-slate-950">{streamReady ? <video ref={videoRef} autoPlay playsInline muted className="max-h-[55vh] w-full object-contain"/> : photoUrl ? <img src={photoUrl} alt="صورة ولي الأمر" className="max-h-[55vh] w-full object-contain"/> : <div className="flex min-h-52 items-center justify-center px-6 text-center text-sm text-slate-300">افتح الكاميرا لالتقاط صورة واضحة للوجه</div>}</div><div className="mt-3 flex gap-2">{!streamReady ? <button type="button" onClick={() => void startCamera()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white"><Camera className="size-4"/>{photo ? 'إعادة التقاط الصورة' : 'فتح الكاميرا'}</button> : <button type="button" onClick={capture} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-extrabold text-white"><Camera className="size-4"/>التقاط الصورة</button>}</div><form onSubmit={handleSubmit} className="mt-5 space-y-4"><label className="block text-sm font-extrabold text-slate-800">أجب عن المسألة: {info.data.a} × {info.data.b} = ?<input type="number" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value)} required className="input mt-2 w-full"/></label>{cameraError ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{cameraError}</p> : null}<button type="submit" disabled={!photo || !answer || submit.isPending} className="w-full rounded-xl border-b-4 border-cyan-700 bg-cyan-500 px-5 py-3.5 font-extrabold text-white disabled:opacity-50">{submit.isPending ? 'جارٍ إرسال الطلب…' : 'إرسال طلب التوثيق'}</button></form></> : null}<Link to="/" className="mt-6 block text-center text-sm font-bold text-cyan-700">العودة إلى مبدعين</Link></section></main>;
};

export default ParentVerifyPage;
