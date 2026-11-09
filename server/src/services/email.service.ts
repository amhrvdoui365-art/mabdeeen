import nodemailer from 'nodemailer';
import { env } from '../config/env';

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendEmail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  const { SMTP_USER, SMTP_APP_PASSWORD } = env;
  if (!SMTP_USER || !SMTP_APP_PASSWORD) return false;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD.replace(/\s/g, '') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Email] Delivery failed:', message);
    return false;
  } finally {
    transporter.close();
  }
};

export const sendParentVerificationEmail = (to: string, childName: string, verificationUrl: string): Promise<boolean> => {
  const safeName = escapeHtml(childName);
  const safeUrl = escapeHtml(verificationUrl);
  const subject = 'موافقة ولي الأمر مطلوبة لتوثيق حساب مبدعين';
  const text = [
    'مرحبًا،',
    '',
    'طلب ' + childName + ' موافقتك على توثيق حسابه في منصة مبدعين.',
    'لإكمال التوثيق:',
    '1. افتح رابط التوثيق الآمن.',
    '2. التقط صورة واضحة لولي الأمر وأجب عن المسألة الحسابية القصيرة.',
    '3. أرسل الطلب للمراجعة الإدارية؛ وسيتم تفعيل الحساب بعد الموافقة.',
    '',
    'رابط التوثيق (صالح لمدة 24 ساعة):',
    verificationUrl,
    '',
    'إذا لم تطلب هذا الإجراء، يمكنك تجاهل الرسالة.',
  ].join('\n');
  const html = [
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:0;background:#eef3f9;font-family:Arial,Tahoma,sans-serif;color:#14213d;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f9;padding:32px 12px;"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,35,70,.12);">',
    '<tr><td style="padding:30px 34px;background:#08234f;background-image:linear-gradient(135deg,#08234f,#126a8a);color:#ffffff;">',
    '<div style="font-size:13px;font-weight:700;letter-spacing:1px;color:#bfe9f2;">مبدعين <span style="color:#f5c96a;">|</span> مساحة آمنة للإبداع</div>',
    '<div style="margin-top:22px;display:inline-block;padding:7px 12px;border:1px solid rgba(255,255,255,.28);border-radius:20px;font-size:12px;color:#e7f7fb;">خطوة مهمة لحماية الحساب</div>',
    '<h1 style="margin:14px 0 0;font-size:27px;line-height:1.5;color:#ffffff;">موافقتك تكمل الطريق</h1>',
    '</td></tr>',
    '<tr><td style="padding:30px 34px 12px;">',
    '<p style="margin:0 0 12px;font-size:16px;line-height:1.9;">مرحبًا،</p>',
    '<p style="margin:0;font-size:16px;line-height:1.9;color:#34445f;">طلب <strong style="color:#0b6f8c;">' + safeName + '</strong> موافقتك على توثيق حسابه في منصة مبدعين. تستغرق الخطوات بضع دقائق، ويظل الحساب غير مفعّل حتى تكتمل مراجعة الطلب.</p>',
    '</td></tr>',
    '<tr><td style="padding:16px 34px 6px;">',
    '<div style="font-size:15px;font-weight:800;color:#14213d;margin-bottom:12px;">خطوات التوثيق</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">',
    '<tr><td width="42" valign="top" style="padding:10px 0;"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:50%;background:#e6f6fa;color:#087b99;font-weight:800;">١</span></td><td style="padding:10px 0;font-size:14px;line-height:1.8;color:#34445f;"><strong style="color:#14213d;">افتح رابط التوثيق</strong><br>استخدم الزر الآمن أدناه خلال 24 ساعة.</td></tr>',
    '<tr><td width="42" valign="top" style="padding:10px 0;"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:50%;background:#e6f6fa;color:#087b99;font-weight:800;">٢</span></td><td style="padding:10px 0;font-size:14px;line-height:1.8;color:#34445f;"><strong style="color:#14213d;">أكمل التحقق</strong><br>التقط صورة واضحة لولي الأمر وأجب عن مسألة حسابية قصيرة.</td></tr>',
    '<tr><td width="42" valign="top" style="padding:10px 0;"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:50%;background:#e6f6fa;color:#087b99;font-weight:800;">٣</span></td><td style="padding:10px 0;font-size:14px;line-height:1.8;color:#34445f;"><strong style="color:#14213d;">انتظر مراجعة الإدارة</strong><br>بعد اعتماد الطلب، يُفعّل الحساب تلقائيًا.</td></tr>',
    '</table></td></tr>',
    '<tr><td align="center" style="padding:18px 34px 24px;">',
    '<table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:11px;background:#087f9e;box-shadow:0 5px 14px rgba(8,127,158,.24);">',
    '<a href="' + safeUrl + '" style="display:inline-block;padding:15px 28px;border:1px solid #087f9e;border-radius:11px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">ابدأ التوثيق بأمان&nbsp; ←</a>',
    '</td></tr></table>',
    '<p style="margin:15px 0 0;font-size:12px;line-height:1.8;color:#738099;">الرابط صالح لمدة 24 ساعة، وبعدها يمكنك طلب رابط جديد.</p>',
    '</td></tr>',
    '<tr><td style="padding:20px 34px;background:#f7f9fc;border-top:1px solid #e7edf4;">',
    '<p style="margin:0 0 8px;font-size:12px;line-height:1.8;color:#64748b;">إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>',
    '<p dir="ltr" style="margin:0;word-break:break-all;font-size:12px;line-height:1.8;"><a href="' + safeUrl + '" style="color:#087f9e;">' + safeUrl + '</a></p>',
    '<p style="margin:16px 0 0;font-size:12px;line-height:1.8;color:#64748b;">إذا لم تطلب هذه الموافقة، يمكنك تجاهل الرسالة. لن يُفعّل الحساب من دون مراجعة الإدارة.</p>',
    '</td></tr>',
    '<tr><td align="center" style="padding:18px 24px;color:#8a96a8;font-size:11px;">© مبدعين — رسالة آلية خاصة بتوثيق الحساب</td></tr>',
    '</table></td></tr></table></body></html>',
  ].join('');
  return sendEmail(to, subject, text, html);
};

export const sendParentVerificationDecisionEmail = (to: string, childName: string, decision: string): Promise<boolean> => {
  const safeName = escapeHtml(childName);
  const safeDecision = escapeHtml(decision);
  const subject = 'تحديث طلب توثيق ولي الأمر — مبدعين';
  const text = 'مرحبًا،\n\n' + decision + ' (' + childName + ').';
  const html = [
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:32px 12px;background:#eef3f9;font-family:Arial,Tahoma,sans-serif;color:#14213d;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(15,35,70,.12);">',
    '<tr><td style="padding:28px 32px;background:#08234f;color:#fff;"><div style="font-size:13px;color:#bfe9f2;font-weight:700;">مبدعين <span style="color:#f5c96a;">|</span> تحديث التوثيق</div><h1 style="margin:16px 0 0;font-size:24px;">نتيجة مراجعة الطلب</h1></td></tr>',
    '<tr><td style="padding:30px 32px;"><p style="margin:0 0 12px;font-size:16px;">مرحبًا،</p><p style="margin:0;font-size:15px;line-height:1.9;color:#34445f;">' + safeDecision + ' (<strong style="color:#087f9e;">' + safeName + '</strong>).</p></td></tr>',
    '<tr><td style="padding:18px 32px;background:#f7f9fc;color:#738099;font-size:12px;">هذه رسالة آلية من منصة مبدعين.</td></tr>',
    '</table></td></tr></table></body></html>',
  ].join('');
  return sendEmail(to, subject, text, html);
};
