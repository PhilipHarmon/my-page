// Page style options and starter layouts.

export const THEMES = [
  { key: 'paper', label: 'Warm Paper' },
  { key: 'clean', label: 'Clean White' },
  { key: 'blossom', label: 'Blossom' },
  { key: 'sage', label: 'Sage Garden' },
  { key: 'midnight', label: 'Midnight (dark)' },
  { key: 'charcoal', label: 'Charcoal (dark)' },
];

export const ACCENTS = [
  { key: '#c75b21', label: 'Label Orange' },
  { key: '#e8a33d', label: 'Lamp-Light Gold' },
  { key: '#0f766e', label: 'Teal' },
  { key: '#b03060', label: 'Berry' },
  { key: '#3454d1', label: 'Royal Blue' },
  { key: '#2e7d32', label: 'Forest' },
  { key: '#7b2d8b', label: 'Plum' },
  { key: '#475569', label: 'Slate' },
];

export const FONTS = [
  { key: 'serif', label: 'Serif (bookish)' },
  { key: 'sans', label: 'Sans (clean)' },
  { key: 'rounded', label: 'Rounded (friendly)' },
];

export const HEADER_STYLES = [
  { key: 'centered', label: 'Centered' },
  { key: 'left', label: 'Left aligned' },
  { key: 'banner', label: 'Banner band' },
];

export const PAGE_WIDTHS = [
  { key: 'narrow', label: 'Narrow (reading)' },
  { key: 'wide', label: 'Wide (gallery)' },
];

export const BLOCK_TYPES = [
  { key: 'heading', label: 'Heading' },
  { key: 'paragraph', label: 'Paragraph' },
  { key: 'photo', label: 'Photo' },
  { key: 'video', label: 'Video' },
  { key: 'quote', label: 'Quote' },
  { key: 'link', label: 'Link Button' },
  { key: 'divider', label: 'Divider' },
];

export const DEFAULT_STYLE = {
  theme: 'paper',
  accent: '#c75b21',
  font: 'serif',
  headerStyle: 'centered',
  width: 'narrow',
};

export const DEFAULT_PAGE = {
  title: 'My Page',
  subtitle: '',
  style: { ...DEFAULT_STYLE },
  blocks: [],
};

let counter = 0;
export function uid() {
  counter += 1;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `block-${Date.now()}-${counter}`;
}

export function emptyBlock(type) {
  const base = { id: uid(), type, width: 'full', align: 'left' };
  switch (type) {
    case 'heading':
      return { ...base, text: '', size: 'medium', align: 'left' };
    case 'paragraph':
      return { ...base, text: '' };
    case 'photo':
      return { ...base, url: '', caption: '' };
    case 'video':
      return { ...base, url: '', caption: '' };
    case 'quote':
      return { ...base, text: '', attribution: '', align: 'center' };
    case 'link':
      return { ...base, label: '', url: '', align: 'center', width: 'full' };
    case 'divider':
      return { ...base };
    default:
      return { ...base, text: '' };
  }
}

function b(type, fields) {
  return { ...emptyBlock(type), ...fields };
}

// One tap replaces the canvas with a scaffold to edit. Blocks only —
// the page title and style are left alone.
export const STARTER_LAYOUTS = [
  {
    key: 'about',
    label: 'About Me',
    make: () => [
      b('heading', { text: 'Hello, I’m …', size: 'large', align: 'center' }),
      b('photo', { width: 'half', caption: 'A favorite photo of me' }),
      b('paragraph', {
        width: 'half',
        text: 'A few lines about who you are and what this page is for.\n\nBlank lines make new paragraphs, so give each thought its own space.',
      }),
      b('heading', { text: 'A few things about me', size: 'medium' }),
      b('paragraph', {
        text: 'Where you live, what you do, what you love. Swap this text for the real story.',
      }),
      b('link', { label: 'Say hello', url: '' }),
    ],
  },
  {
    key: 'photo-story',
    label: 'Photo Story',
    make: () => [
      b('heading', { text: 'A day in pictures', size: 'large', align: 'center' }),
      b('photo', { width: 'third', caption: 'Morning' }),
      b('photo', { width: 'third', caption: 'Midday' }),
      b('photo', { width: 'third', caption: 'Evening' }),
      b('paragraph', {
        text: 'Tell the story of the day here — what happened, who was there, and the small moment you most want to remember.',
      }),
      b('photo', { width: 'half', caption: '' }),
      b('photo', { width: 'half', caption: '' }),
    ],
  },
  {
    key: 'journal',
    label: 'Journal',
    make: () => [
      b('heading', { text: 'Journal', size: 'large' }),
      b('paragraph', {
        text: 'Today’s entry. Write it plain, like a letter to yourself.',
      }),
      b('divider', {}),
      b('heading', { text: 'Earlier', size: 'small' }),
      b('paragraph', { text: 'Yesterday, in a sentence or two.' }),
      b('quote', { text: 'A line worth keeping.', attribution: '' }),
    ],
  },
  {
    key: 'favorites',
    label: 'Favorites',
    make: () => [
      b('heading', { text: 'My favorites', size: 'large', align: 'center' }),
      b('paragraph', {
        align: 'center',
        text: 'The best of everything, in one place. Links, photos and the reasons why.',
      }),
      b('link', { label: 'Favorite listen', url: '', width: 'third' }),
      b('link', { label: 'Favorite watch', url: '', width: 'third' }),
      b('link', { label: 'Favorite read', url: '', width: 'third' }),
      b('photo', { caption: 'The one above all the others' }),
      b('quote', { text: 'Why this one wins.', attribution: '' }),
    ],
  },
];
