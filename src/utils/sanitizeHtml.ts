import DOMPurify from 'dompurify';

// El editor de texto enriquecido (RichTextEditor.tsx) solo produce estas
// etiquetas/atributos — cualquier otra cosa (script, img onerror, iframe,
// atributos on*, etc.) viene de HTML pegado o del backend, y ya debería venir
// sanitizado desde ahí, pero se sanitiza también acá antes de renderizar.
const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'div', 'span'];
const ALLOWED_ATTR = ['style'];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
