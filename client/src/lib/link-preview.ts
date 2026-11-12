const BLOCKED_V4 = (host: string): boolean => {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
};

const BLOCKED_V6 = (host: string): boolean =>
  host.startsWith('[') && /^\[(::1?|fe80:|fc|fd)/i.test(host);

const isBlockedHost = (host: string): boolean =>
  !host
  || host === 'localhost'
  || host.endsWith('.localhost')
  || host.endsWith('.local')
  || host.endsWith('.internal')
  || host.endsWith('.home.arpa')
  || BLOCKED_V4(host)
  || BLOCKED_V6(host);

/** Adds a missing https:// scheme and rejects non-https, credentialed, and local network links. */
export const normalizeExternalUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value || value.length > 2048) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (isBlockedHost(url.hostname.toLowerCase().replace(/\.$/, ''))) return null;
  return url.toString();
};

export type PreviewProvider = 'youtube' | 'vimeo' | 'drive' | 'docs' | 'loom' | 'website';

export type LinkPreview =
  | { kind: 'media'; provider: 'media'; mediaType: 'video' | 'audio' | 'image'; url: string }
  | { kind: 'frame'; provider: PreviewProvider; embedUrl: string; originalUrl: string; label: string };

const PROVIDER_LABELS: Record<PreviewProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  docs: 'Google Docs',
  loom: 'Loom',
  website: 'الموقع',
};

const stripWww = (host: string): string => host.replace(/^(www|m)\./i, '');

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const youtubePreview = (url: URL, host: string): LinkPreview | null => {
  if (host !== 'youtu.be' && host !== 'youtube.com' && !host.endsWith('.youtube.com') && host !== 'youtube-nocookie.com') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  let videoId = '';
  if (host === 'youtu.be') videoId = segments[0] ?? '';
  else if (segments[0] === 'watch') videoId = url.searchParams.get('v') ?? '';
  else if (['shorts', 'live', 'embed', 'v'].includes(segments[0] ?? '')) videoId = segments[1] ?? '';
  const playlistId = url.searchParams.get('list');
  if (videoId && /^[\w-]{6,}$/.test(videoId)) {
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    embed.searchParams.set('rel', '0');
    if (playlistId) embed.searchParams.set('list', playlistId);
    return { kind: 'frame', provider: 'youtube', embedUrl: embed.toString(), originalUrl: url.toString(), label: PROVIDER_LABELS.youtube };
  }
  if (playlistId && /^[\w-]{6,}$/.test(playlistId)) {
    return { kind: 'frame', provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`, originalUrl: url.toString(), label: PROVIDER_LABELS.youtube };
  }
  return null;
};

const vimeoPreview = (url: URL, host: string): LinkPreview | null => {
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[0] === 'video' ? segments[1] : segments[0];
  if (!id || !/^\d{5,}$/.test(id)) return null;
  const hash = url.searchParams.get('h') ?? (segments[1] && /^[a-z0-9]+$/i.test(segments[1]) ? segments[1] : null);
  const embed = new URL(`https://player.vimeo.com/video/${id}`);
  if (hash) embed.searchParams.set('h', hash);
  return { kind: 'frame', provider: 'vimeo', embedUrl: embed.toString(), originalUrl: url.toString(), label: PROVIDER_LABELS.vimeo };
};

const drivePreview = (url: URL, host: string): LinkPreview | null => {
  if (host !== 'drive.google.com') return null;
  const path = url.pathname.replace(/\/+$/, '');
  const fileMatch = path.match(/\/file\/d\/([^/]+)/);
  const folderMatch = path.match(/\/drive\/(?:u\/\d+\/)?folders\/([^/]+)/);
  const id = fileMatch?.[1] ?? (path === '/open' || path === '/uc' ? url.searchParams.get('id') : null);
  const resourceKey = url.searchParams.get('resourcekey');
  if (id) {
    const embed = new URL(`https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`);
    if (resourceKey) embed.searchParams.set('resourcekey', resourceKey);
    return { kind: 'frame', provider: 'drive', embedUrl: embed.toString(), originalUrl: url.toString(), label: PROVIDER_LABELS.drive };
  }
  if (folderMatch?.[1]) {
    return { kind: 'frame', provider: 'drive', embedUrl: `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderMatch[1])}#list`, originalUrl: url.toString(), label: PROVIDER_LABELS.drive };
  }
  return null;
};

const docsPreview = (url: URL, host: string): LinkPreview | null => {
  if (host !== 'docs.google.com') return null;
  const published = /\/(pub|pubhtml|embed)(\/|$)/.test(url.pathname);
  if (!published) return null;
  return { kind: 'frame', provider: 'docs', embedUrl: url.toString(), originalUrl: url.toString(), label: PROVIDER_LABELS.docs };
};

const loomPreview = (url: URL, host: string): LinkPreview | null => {
  if (host !== 'loom.com') return null;
  const id = url.pathname.match(/\/(?:share|v|embed)\/([\w-]+)/)?.[1];
  if (!id) return null;
  return { kind: 'frame', provider: 'loom', embedUrl: `https://www.loom.com/embed/${encodeURIComponent(id)}`, originalUrl: url.toString(), label: PROVIDER_LABELS.loom };
};

const MEDIA_TYPES: Record<string, 'video' | 'audio' | 'image'> = {
  mp4: 'video', webm: 'video', ogv: 'video', mov: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image', svg: 'image',
};

export const resolveLinkPreview = (rawUrl: string): LinkPreview | null => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = stripWww(url.hostname.toLowerCase().replace(/\.$/, ''));
  const provider = youtubePreview(url, host) ?? vimeoPreview(url, host) ?? drivePreview(url, host)
    ?? docsPreview(url, host) ?? loomPreview(url, host);
  if (provider) return provider;
  const extension = safeDecode(url.pathname).split('.').pop()?.toLowerCase() ?? '';
  const mediaType = MEDIA_TYPES[extension];
  if (mediaType) return { kind: 'media', provider: 'media', mediaType, url: url.toString() };
  return { kind: 'frame', provider: 'website', embedUrl: url.toString(), originalUrl: url.toString(), label: "الموقع" };
};
