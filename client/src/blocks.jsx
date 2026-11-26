import { useEffect, useRef, useState } from 'react';
import { uploadMedia } from './api';
import { normalizeMediaUrl } from './media';

// Keep in step with the server cap in server/routes/media.js.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Split text into paragraphs: a blank line starts a new paragraph.
export function paragraphs(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

function safeHref(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  return `https://${u}`;
}

// ------------------------- View rendering --------------------------------

export function BlockView({ block }) {
  const alignClass = `a-${block.align || 'left'}`;
  switch (block.type) {
    case 'heading': {
      const Tag = block.size === 'large' ? 'h2' : block.size === 'small' ? 'h4' : 'h3';
      return (
        <Tag className={`block-heading h-${block.size || 'medium'} ${alignClass}`}>
          {block.text || ''}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <div className={`block-paragraph ${alignClass}`}>
          {paragraphs(block.text).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      );
    case 'photo': {
      const m = normalizeMediaUrl(block.url, 'image');
      if (m.status !== 'ok') return null;
      return (
        <figure className={`block-photo ${alignClass}`}>
          <img src={m.src} alt={block.caption || ''} loading="lazy" />
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case 'video': {
      const v = normalizeMediaUrl(block.url, 'video');
      if (v.status !== 'ok') return null;
      return (
        <figure className="block-video">
          <div className="video-frame">
            {v.render === 'embed' ? (
              <iframe
                src={v.src}
                title={block.caption || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video src={v.src} controls playsInline preload="metadata" />
            )}
          </div>
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case 'quote':
      return (
        <blockquote className={`block-quote ${alignClass}`}>
          {paragraphs(block.text).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {block.attribution ? <footer>— {block.attribution}</footer> : null}
        </blockquote>
      );
    case 'link': {
      const href = safeHref(block.url);
      if (!href || !block.label) return null;
      return (
        <div className={`block-link ${alignClass}`}>
          <a className="link-button" href={href} target="_blank" rel="noreferrer">
            {block.label}
          </a>
        </div>
      );
    }
    case 'divider':
      return <hr className="block-divider" />;
    default:
      return null;
  }
}

// ------------------------- Design-mode editor -----------------------------

function MediaFields({ block, onChange, resourceType, editCode, onRequestCode, onCodeRejected }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const pendingFile = useRef(null);

  const media = normalizeMediaUrl(block.url, resourceType);
  const linkHint =
    resourceType === 'video'
      ? 'Google Drive, Dropbox, YouTube, Vimeo, or a direct file link.'
      : 'Google Drive, Dropbox, or a direct image link.';

  async function uploadFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('That file is over the 100 MB upload limit.');
      return;
    }
    if (!editCode) {
      // Editing isn't unlocked yet: ask for the code first (the upload
      // runs automatically once it's entered) instead of failing.
      pendingFile.current = file;
      setUploadError('');
      if (typeof onRequestCode === 'function') onRequestCode();
      return;
    }
    setUploading(true);
    setProgress(null);
    setUploadError('');
    try {
      const url = await uploadMedia(file, editCode, setProgress);
      onChange({ url });
    } catch (err) {
      if (err.status === 401 && typeof onCodeRejected === 'function') {
        // Wrong code: forget it, like a failed save does, so the next
        // attempt asks again.
        onCodeRejected();
      }
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  // An upload that was waiting on the edit code runs as soon as a code
  // exists (the unlock prompt lives in App and updates the prop).
  useEffect(() => {
    if (editCode && pendingFile.current) {
      const file = pendingFile.current;
      pendingFile.current = null;
      uploadFile(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCode]);

  // Don't let a stale picked file upload into a different block later.
  useEffect(() => () => {
    pendingFile.current = null;
  }, []);

  function handleFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    uploadFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    uploadFile(file);
  }

  return (
    <>
      <p className="media-route-label">Upload from this device</p>
      <div
        className={`media-drop${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <label className="field">
          <span>{dragging ? 'Drop the file to upload it' : 'Choose a file, or drop one here'}</span>
          <input
            type="file"
            accept={resourceType === 'video' ? 'video/*' : 'image/*'}
            onChange={handleFile}
            disabled={uploading}
          />
          {uploading ? (
            <span className="field-note">
              Uploading…{progress !== null ? ` ${progress}%` : ''}
            </span>
          ) : null}
          {uploadError ? <span className="field-error">{uploadError}</span> : null}
        </label>
        <p className="field-note">
          On iPhone or Mac the picker opens the Files app — you can pick photos and videos from
          iCloud Drive or the Google Drive app there too.
        </p>
        <p className="field-note">
          Files up to 100 MB. Uploads live in the page’s own database, so photos and short
          clips suit it best — long videos are better as a YouTube or Drive link below.
        </p>
      </div>

      <p className="media-route-label">Paste a link</p>
      <label className="field">
        <span>{linkHint}</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={block.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
        />
      </label>
      {media.status === 'icloud' ? <p className="icloud-note">{media.message}</p> : null}

      <label className="field">
        <span>Caption (optional)</span>
        <input
          type="text"
          value={block.caption || ''}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </label>
    </>
  );
}

const TYPE_LABELS = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  photo: 'Photo',
  video: 'Video',
  quote: 'Quote',
  link: 'Link Button',
  divider: 'Divider',
};

const ALIGNABLE = ['heading', 'paragraph', 'quote', 'link'];

export function BlockEditor({
  block,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  isFirst,
  isLast,
  editCode,
  onRequestCode,
  onCodeRejected,
}) {
  return (
    <div className="block-editor">
      <div className="editor-head">
        <span className="editor-type">{TYPE_LABELS[block.type] || block.type}</span>
        <span className="editor-tools">
          <label className="mini-select">
            Width
            <select value={block.width} onChange={(e) => onChange({ width: e.target.value })}>
              <option value="full">Full</option>
              <option value="half">Half</option>
              <option value="third">Third</option>
            </select>
          </label>
          {ALIGNABLE.includes(block.type) ? (
            <label className="mini-select">
              Align
              <select value={block.align} onChange={(e) => onChange({ align: e.target.value })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          ) : null}
          <button type="button" className="ebtn" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move up">
            ↑
          </button>
          <button type="button" className="ebtn" onClick={() => onMove(1)} disabled={isLast} aria-label="Move down">
            ↓
          </button>
          <button type="button" className="ebtn" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" className="ebtn danger" onClick={onDelete}>
            Delete
          </button>
        </span>
      </div>

      <div className="editor-body">
        {block.type === 'heading' && (
          <>
            <label className="field">
              <span>Heading text</span>
              <input
                type="text"
                value={block.text || ''}
                onChange={(e) => onChange({ text: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Size</span>
              <select value={block.size || 'medium'} onChange={(e) => onChange({ size: e.target.value })}>
                <option value="large">Large</option>
                <option value="medium">Medium</option>
                <option value="small">Small</option>
              </select>
            </label>
          </>
        )}

        {block.type === 'paragraph' && (
          <label className="field">
            <span>Text — leave a blank line between paragraphs</span>
            <textarea
              rows={6}
              value={block.text || ''}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </label>
        )}

        {block.type === 'photo' && (
          <MediaFields
            block={block}
            onChange={onChange}
            resourceType="image"
            editCode={editCode}
            onRequestCode={onRequestCode}
            onCodeRejected={onCodeRejected}
          />
        )}

        {block.type === 'video' && (
          <MediaFields
            block={block}
            onChange={onChange}
            resourceType="video"
            editCode={editCode}
            onRequestCode={onRequestCode}
            onCodeRejected={onCodeRejected}
          />
        )}

        {block.type === 'quote' && (
          <>
            <label className="field">
              <span>Quote</span>
              <textarea
                rows={3}
                value={block.text || ''}
                onChange={(e) => onChange({ text: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Who said it (optional)</span>
              <input
                type="text"
                value={block.attribution || ''}
                onChange={(e) => onChange({ attribution: e.target.value })}
              />
            </label>
          </>
        )}

        {block.type === 'link' && (
          <>
            <label className="field">
              <span>Button words</span>
              <input
                type="text"
                value={block.label || ''}
                onChange={(e) => onChange({ label: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Goes to</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={block.url || ''}
                onChange={(e) => onChange({ url: e.target.value })}
              />
            </label>
          </>
        )}

        {block.type === 'divider' && <p className="field-note">A simple line across the page.</p>}
      </div>

      <div className="editor-preview">
        <BlockView block={block} />
      </div>
    </div>
  );
}
