const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function readError(res) {
  try {
    const data = await res.json();
    if (data && data.error) return data.error;
  } catch {
    // fall through to the generic message
  }
  return `Request failed (${res.status})`;
}

export async function fetchPage() {
  const res = await fetch(`${API_URL}/page`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function savePage(page, editCode) {
  const res = await fetch(`${API_URL}/page`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-edit-code': editCode || '',
    },
    body: JSON.stringify(page),
  });
  if (!res.ok) {
    const err = new Error(await readError(res));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// --- Photo/video uploads ---------------------------------------------------
// Files upload to this page's own API (POST /api/media), which stores
// them in the same MongoDB as the page itself — no third-party storage,
// no extra accounts, no settings to configure. Uploading requires the
// edit code, exactly like saving. The block stores only the returned
// media URL.

export function uploadMedia(file, editCode, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/media`);
    xhr.setRequestHeader('x-edit-code', editCode || '');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.id) {
        // API_URL already ends in /api, locally and on Render alike, so
        // the stored URL is absolute and works from any origin.
        resolve(`${API_URL.replace(/\/+$/, '')}/media/${data.id}`);
        return;
      }
      const err = new Error(
        (data && data.error) || `Upload failed (${xhr.status})`,
      );
      err.status = xhr.status;
      reject(err);
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again.'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
