import { AppError } from './app-error';

const isBlockedIpv4 = (host: string): boolean => {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
};

const isBlockedIpv6 = (host: string): boolean =>
  host.startsWith('[') && /^\[(::1?|fe80:|fc|fd)/i.test(host);

const isBlockedHost = (host: string): boolean =>
  !host
  || host === 'localhost'
  || host.endsWith('.localhost')
  || host.endsWith('.local')
  || host.endsWith('.internal')
  || host.endsWith('.home.arpa')
  || isBlockedIpv4(host)
  || isBlockedIpv6(host);

/**
 * Accepts public HTTPS links even when the scheme was omitted, and rejects
 * credentialed, local, or non-HTTPS targets. No outbound request is made.
 */
export const normalizeExternalUrl = (raw: string): string => {
  const value = raw.trim();
  if (!value) throw new AppError('الرابط مطلوب.', 400);
  if (value.length > 2048) throw new AppError('الرابط أطول من الحد المسموح.', 400);
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new AppError('الرابط غير صالح.', 400);
  }
  if (parsed.protocol !== 'https:') throw new AppError('استخدم رابط HTTPS عامًا وآمنًا.', 400);
  if (parsed.username || parsed.password) throw new AppError('لا تستخدم روابط تحتوي على بيانات دخول.', 400);
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (isBlockedHost(host)) throw new AppError('استخدم رابطًا عامًا وليس عنوانًا محليًا.', 400);
  return parsed.toString();
};

export const classifyExternalSource = (normalizedUrl: string): 'youtube' | 'drive' | 'website' => {
  const host = new URL(normalizedUrl).hostname.toLowerCase();
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube';
  if (host === 'drive.google.com') return 'drive';
  return 'website';
};
