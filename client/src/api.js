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

// --- Optional photo/video uploads via Cloudinary (unsigned preset) -------
// Same pattern as Photo Journal: the browser uploads straight to
// Cloudinary and only the resulting URL is stored in the block. When the
// two env vars are not set, uploads are off and link-pasting still works.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const uploadsEnabled = Boolean(CLOUD_NAME && UPLOAD_PRESET);

export async function uploadToCloudinary(file, resourceType) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) throw new Error('Upload failed — check the file and try again.');
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload finished but returned no link.');
  return data.secure_url;
}
