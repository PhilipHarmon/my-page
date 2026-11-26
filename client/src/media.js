// Shared media-link normalization for Photo and Video blocks.
//
// Philip pastes links from many places; this turns each one into the form
// that actually displays on a web page, or explains why it can't:
//
//   Google Drive share link  -> image: direct display URL (uc?export=view)
//                               video: embeddable preview iframe
//   Dropbox share link       -> direct host (dl.dropboxusercontent.com)
//   YouTube / Vimeo link     -> embed player (video blocks, as in v1)
//   iCloud share link        -> cannot be hotlinked or embedded at all;
//                               reported so the editor can explain and
//                               point at Upload instead
//   anything else            -> passed through unchanged
//
// The block stores the link exactly as pasted; normalization happens at
// render time (and in the editor, for feedback), so links saved before
// this existed are fixed up too, and a provider changing its URL shapes
// only needs a fix here.

export const ICLOUD_MESSAGE =
  'iCloud links can’t be embedded on a web page. Use “Upload from this device” instead — in the file picker, choose the photo or video from iCloud Drive.';

function driveFileId(url) {
  // drive.google.com/file/d/<id>/view…
  const fromPath = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  if (fromPath) return fromPath[1];
  // drive.google.com/open?id=<id> and drive.google.com/uc?…&id=<id>
  const fromQuery = url.searchParams.get('id');
  if (fromQuery && /^[A-Za-z0-9_-]+$/.test(fromQuery)) return fromQuery;
  return null;
}

function isIcloudShare(url) {
  const host = url.hostname.toLowerCase();
  if (host === 'share.icloud.com') return true;
  if (host.endsWith('icloud.com')) {
    return url.pathname.includes('/photos') || url.pathname.includes('/sharedalbum');
  }
  return false;
}

const DROPBOX_HOSTS = new Set([
  'www.dropbox.com',
  'dropbox.com',
  'dl.dropbox.com',
  'dl.dropboxusercontent.com',
]);

// kind: 'image' (Photo block) | 'video' (Video block)
// Returns one of:
//   { status: 'empty' }
//   { status: 'icloud', message }
//   { status: 'ok', render: 'image' | 'embed' | 'file', src, source }
export function normalizeMediaUrl(rawUrl, kind) {
  const u = String(rawUrl || '').trim();
  if (!u) return { status: 'empty' };

  let url = null;
  try {
    url = new URL(u);
  } catch {
    url = null; // not a parseable URL — fall through to passthrough below
  }

  if (url) {
    const host = url.hostname.toLowerCase();

    if (isIcloudShare(url)) {
      return { status: 'icloud', message: ICLOUD_MESSAGE };
    }

    if (host === 'drive.google.com') {
      const id = driveFileId(url);
      if (id) {
        if (kind === 'video') {
          return {
            status: 'ok',
            render: 'embed',
            src: `https://drive.google.com/file/d/${id}/preview`,
            source: 'drive',
          };
        }
        return {
          status: 'ok',
          render: 'image',
          src: `https://drive.google.com/uc?export=view&id=${id}`,
          source: 'drive',
        };
      }
    }

    if (DROPBOX_HOSTS.has(host)) {
      if (host === 'dl.dropboxusercontent.com') {
        return {
          status: 'ok',
          render: kind === 'video' ? 'file' : 'image',
          src: u,
          source: 'dropbox',
        };
      }
      // Swap to the direct host; keep the path and any sharing keys
      // (e.g. rlkey on /scl/fi/ links), drop the dl flag itself.
      const params = new URLSearchParams(url.search);
      params.delete('dl');
      const query = params.toString();
      return {
        status: 'ok',
        render: kind === 'video' ? 'file' : 'image',
        src: `https://dl.dropboxusercontent.com${url.pathname}${query ? `?${query}` : ''}`,
        source: 'dropbox',
      };
    }
  }

  if (kind === 'video') {
    // YouTube / Vimeo embeds — same handling as v1.
    const yt = u.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
    );
    if (yt) {
      return {
        status: 'ok',
        render: 'embed',
        src: `https://www.youtube-nocookie.com/embed/${yt[1]}`,
        source: 'youtube',
      };
    }
    const vm = u.match(/vimeo\.com\/(\d+)/);
    if (vm) {
      return {
        status: 'ok',
        render: 'embed',
        src: `https://player.vimeo.com/video/${vm[1]}`,
        source: 'vimeo',
      };
    }
    return { status: 'ok', render: 'file', src: u, source: 'direct' };
  }

  return { status: 'ok', render: 'image', src: u, source: 'direct' };
}
