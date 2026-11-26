import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPage, savePage } from './api';
import { BlockEditor, BlockView } from './blocks';
import {
  ACCENTS,
  BLOCK_TYPES,
  DEFAULT_PAGE,
  DEFAULT_STYLE,
  FONTS,
  HEADER_STYLES,
  PAGE_WIDTHS,
  STARTER_LAYOUTS,
  THEMES,
  emptyBlock,
  uid,
} from './themes';

const CODE_KEY = 'my-page-edit-code';

function Footer() {
  return <footer className="site-credit">⌛ Built by Stolen Hours Software — built after bedtime</footer>;
}

export default function App() {
  const [page, setPage] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('view');
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');
  const [editCode, setEditCode] = useState(() => sessionStorage.getItem(CODE_KEY) || '');
  const [codePrompt, setCodePrompt] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [openMenu, setOpenMenu] = useState(null); // 'add' | 'layouts' | 'style' | null
  const pendingDesign = useRef(false);

  const load = useCallback(async () => {
    setLoadError('');
    setPage(null);
    try {
      const data = await fetchPage();
      setPage({
        title: data.title || DEFAULT_PAGE.title,
        subtitle: data.subtitle || '',
        style: { ...DEFAULT_STYLE, ...(data.style || {}) },
        blocks: Array.isArray(data.blocks) ? data.blocks : [],
      });
      setDirty(false);
    } catch (err) {
      setLoadError(err.message || 'The page could not be loaded.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // --- page mutations (design mode) ---------------------------------------
  const mutate = useCallback((fn) => {
    setPage((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
    setSaveState('idle');
    setSaveError('');
  }, []);

  const setTitle = (title) => mutate((p) => ({ ...p, title }));
  const setSubtitle = (subtitle) => mutate((p) => ({ ...p, subtitle }));
  const setStyle = (patch) => mutate((p) => ({ ...p, style: { ...p.style, ...patch } }));

  const addBlock = (type) => {
    mutate((p) => ({ ...p, blocks: [...p.blocks, emptyBlock(type)] }));
    setOpenMenu(null);
  };

  const updateBlock = (id, patch) =>
    mutate((p) => ({
      ...p,
      blocks: p.blocks.map((blk) => (blk.id === id ? { ...blk, ...patch } : blk)),
    }));

  const moveBlock = (id, dir) =>
    mutate((p) => {
      const blocks = [...p.blocks];
      const i = blocks.findIndex((blk) => blk.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= blocks.length) return p;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...p, blocks };
    });

  const duplicateBlock = (id) =>
    mutate((p) => {
      const i = p.blocks.findIndex((blk) => blk.id === id);
      if (i < 0) return p;
      const copy = { ...p.blocks[i], id: uid() };
      const blocks = [...p.blocks];
      blocks.splice(i + 1, 0, copy);
      return { ...p, blocks };
    });

  const deleteBlock = (id) =>
    mutate((p) => ({ ...p, blocks: p.blocks.filter((blk) => blk.id !== id) }));

  const applyLayout = (layout) => {
    if (
      page.blocks.length > 0 &&
      !window.confirm(`Replace everything on the page with the “${layout.label}” starter layout?`)
    ) {
      return;
    }
    mutate((p) => ({ ...p, blocks: layout.make() }));
    setOpenMenu(null);
  };

  // --- edit code + saving ---------------------------------------------------
  const enterDesign = () => {
    if (editCode) {
      setMode('design');
    } else {
      pendingDesign.current = true;
      setCodeDraft('');
      setCodePrompt(true);
    }
  };

  const confirmCode = () => {
    const code = codeDraft.trim();
    if (!code) return;
    sessionStorage.setItem(CODE_KEY, code);
    setEditCode(code);
    setCodePrompt(false);
    if (pendingDesign.current) {
      pendingDesign.current = false;
      setMode('design');
    }
  };

  const changeCode = () => {
    pendingDesign.current = false;
    setCodeDraft('');
    setCodePrompt(true);
  };

  const save = async () => {
    if (!page) return;
    setSaveState('saving');
    setSaveError('');
    try {
      const saved = await savePage(page, editCode);
      setPage({
        title: saved.title,
        subtitle: saved.subtitle || '',
        style: { ...DEFAULT_STYLE, ...(saved.style || {}) },
        blocks: Array.isArray(saved.blocks) ? saved.blocks : [],
      });
      setDirty(false);
      setSaveState('saved');
    } catch (err) {
      setSaveState('error');
      setSaveError(err.message || 'Saving failed.');
      if (err.status === 401) {
        // Wrong code: forget it and ask again.
        sessionStorage.removeItem(CODE_KEY);
        setEditCode('');
      }
    }
  };

  // --- render ---------------------------------------------------------------
  if (loadError) {
    return (
      <div className="page-root" data-theme="paper" data-font="serif">
        <main className="page-inner narrow">
          <div className="load-box">
            <h1>My Page</h1>
            <p>{loadError}</p>
            <button type="button" className="dbtn primary" onClick={load}>
              Try again
            </button>
          </div>
          <Footer />
        </main>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="page-root" data-theme="paper" data-font="serif">
        <main className="page-inner narrow">
          <p className="loading">Loading the page…</p>
        </main>
      </div>
    );
  }

  const style = page.style;
  const designing = mode === 'design';

  return (
    <div
      className="page-root"
      data-theme={style.theme}
      data-font={style.font}
      style={{ '--accent': style.accent }}
    >
      {designing && (
        <div className="design-bar">
          <span className="design-bar-title">Designing</span>

          <div className="menu-wrap">
            <button type="button" className="dbtn" onClick={() => setOpenMenu(openMenu === 'add' ? null : 'add')}>
              + Add block
            </button>
            {openMenu === 'add' && (
              <div className="menu-list">
                {BLOCK_TYPES.map((t) => (
                  <button key={t.key} type="button" onClick={() => addBlock(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="menu-wrap">
            <button
              type="button"
              className="dbtn"
              onClick={() => setOpenMenu(openMenu === 'layouts' ? null : 'layouts')}
            >
              Starter layouts
            </button>
            {openMenu === 'layouts' && (
              <div className="menu-list">
                {STARTER_LAYOUTS.map((l) => (
                  <button key={l.key} type="button" onClick={() => applyLayout(l)}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="dbtn"
            onClick={() => setOpenMenu(openMenu === 'style' ? null : 'style')}
          >
            Style
          </button>

          <button type="button" className="dbtn" onClick={changeCode}>
            Edit code
          </button>

          <span className="design-bar-spacer" />

          {saveState === 'saved' && !dirty && <span className="save-ok">Saved ✓</span>}
          {dirty && <span className="save-dirty">Unsaved changes</span>}
          <button type="button" className="dbtn primary" onClick={save} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="dbtn" onClick={() => setMode('view')}>
            View page
          </button>
        </div>
      )}

      {designing && saveState === 'error' && (
        <div className="save-error-bar" role="alert">
          {saveError}
          {!editCode && (
            <button type="button" className="dbtn" onClick={changeCode}>
              Re-enter edit code
            </button>
          )}
        </div>
      )}

      {designing && openMenu === 'style' && (
        <section className="style-panel">
          <div className="style-grid">
            <label className="field">
              <span>Page title</span>
              <input type="text" value={page.title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="field">
              <span>Subtitle</span>
              <input type="text" value={page.subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </label>
            <label className="field">
              <span>Background</span>
              <select value={style.theme} onChange={(e) => setStyle({ theme: e.target.value })}>
                {THEMES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type style</span>
              <select value={style.font} onChange={(e) => setStyle({ font: e.target.value })}>
                {FONTS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Header style</span>
              <select value={style.headerStyle} onChange={(e) => setStyle({ headerStyle: e.target.value })}>
                {HEADER_STYLES.map((h) => (
                  <option key={h.key} value={h.key}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Page width</span>
              <select value={style.width} onChange={(e) => setStyle({ width: e.target.value })}>
                {PAGE_WIDTHS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span>Accent color</span>
              <div className="swatches">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={`swatch${style.accent === a.key ? ' sel' : ''}`}
                    style={{ background: a.key }}
                    title={a.label}
                    aria-label={a.label}
                    onClick={() => setStyle({ accent: a.key })}
                  />
                ))}
                <input
                  type="color"
                  className="accent-custom"
                  value={style.accent}
                  onChange={(e) => setStyle({ accent: e.target.value })}
                  aria-label="Custom accent color"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <main className={`page-inner ${style.width}`}>
        <header className={`site-header hs-${style.headerStyle}`}>
          <h1 className="site-title">{page.title}</h1>
          {page.subtitle ? <p className="site-subtitle">{page.subtitle}</p> : null}
        </header>

        {page.blocks.length === 0 && !designing && (
          <p className="blank-note">This page is still blank — check back soon.</p>
        )}
        {page.blocks.length === 0 && designing && (
          <p className="blank-note">
            A blank canvas. Add a block above, or start from a starter layout.
          </p>
        )}

        <div className="blocks">
          {page.blocks.map((block, i) =>
            designing ? (
              <div key={block.id} className={`block-cell w-${block.width}`}>
                <BlockEditor
                  block={block}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                  isFirst={i === 0}
                  isLast={i === page.blocks.length - 1}
                />
              </div>
            ) : (
              <div key={block.id} className={`block-cell w-${block.width}`}>
                <BlockView block={block} />
              </div>
            ),
          )}
        </div>

        <Footer />
      </main>

      {!designing && (
        <button type="button" className="design-fab" onClick={enterDesign}>
          ✎ Design this page
        </button>
      )}

      {codePrompt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit code">
          <div className="modal">
            <h2>Editing is locked</h2>
            <p>
              Type the edit code you chose for this page. It’s checked on the server when you
              save — it never lives in the website itself.
            </p>
            <input
              type="password"
              autoFocus
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCode();
              }}
              placeholder="Edit code"
            />
            <div className="modal-actions">
              <button
                type="button"
                className="dbtn"
                onClick={() => {
                  setCodePrompt(false);
                  pendingDesign.current = false;
                }}
              >
                Cancel
              </button>
              <button type="button" className="dbtn primary" onClick={confirmCode} disabled={!codeDraft.trim()}>
                Start designing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
