// ============================================================================
// ICONOS (icons.js) — iconos de línea SVG, sin emojis.
// stroke = currentColor, se controla tamaño y color desde CSS.
// ============================================================================

const PATHS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  camera:
    '<path d="M4 8h2.5L8 6h8l1.5 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.3"/>',
  receipt:
    '<path d="M6 3.5h12v16l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3z"/><path d="M9 8h6M9 11.5h6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.4-4.4"/>',
  basket:
    '<path d="M4 8h16l-1.1 11.1a1 1 0 0 1-1 .9H6.1a1 1 0 0 1-1-.9z"/><path d="M4 8l2.2-4h11.6L20 8"/><path d="M9.5 12v4M14.5 12v4"/>',
  tag:
    '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/>',
};

export function icon(name, size = 24) {
  const p = PATHS[name] || "";
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${p}</svg>`;
}
