const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_PROTOCOL_REGEX = /(?:javascript|data|vbscript)\s*:/gi;

export const REVIEW_CONSTRAINTS = {
  authorNameMinLength: 1,
  authorNameMaxLength: 80,
  contentMinLength: 10,
  contentMaxLength: 1200,
  maxReactionTags: 3,
} as const;

export function escapeHtmlEntities(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza entradas de texto de usuario contra XSS, etiquetas HTML embebidas,
 * protocolos peligrosos y caracteres de control invisibles.
 */
export function sanitizePlainText(input: string, maxLength = 1200): string {
  const withoutControls = input.replace(CONTROL_CHARS_REGEX, '');
  const withoutTags = withoutControls.replace(HTML_TAG_REGEX, ' ');
  const withoutProtocols = withoutTags.replace(SCRIPT_PROTOCOL_REGEX, '');
  const collapsed = withoutProtocols.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, maxLength);
}

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface ReviewValidationOutput {
  ok: boolean;
  sanitizedAuthorName: string;
  sanitizedContent: string;
  errorMessage?: string;
}

export function validateAndSanitizeReview(
  authorName: string,
  content: string,
  reactionCount: number,
): ReviewValidationOutput {
  const cleanName = sanitizePlainText(authorName, REVIEW_CONSTRAINTS.authorNameMaxLength);
  const cleanContent = sanitizePlainText(content, REVIEW_CONSTRAINTS.contentMaxLength);

  if (cleanName.length < REVIEW_CONSTRAINTS.authorNameMinLength) {
    return {
      ok: false,
      sanitizedAuthorName: cleanName,
      sanitizedContent: cleanContent,
      errorMessage: 'Por favor escribe tu nombre antes de publicar tu opinión.',
    };
  }

  if (cleanContent.length < REVIEW_CONSTRAINTS.contentMinLength) {
    return {
      ok: false,
      sanitizedAuthorName: cleanName,
      sanitizedContent: cleanContent,
      errorMessage: `Tu reseña debe tener al menos ${REVIEW_CONSTRAINTS.contentMinLength} caracteres útiles.`,
    };
  }

  // Anti-spam check: prevent excessive single-character flooding (e.g. "aaaaaaaaaaaa")
  const uniqueChars = new Set(cleanContent.toLowerCase().replace(/\s/g, '')).size;
  if (uniqueChars < 4) {
    return {
      ok: false,
      sanitizedAuthorName: cleanName,
      sanitizedContent: cleanContent,
      errorMessage: 'El mensaje parece repetitivo. Escribe una opinión genuina sobre la lectura.',
    };
  }

  if (reactionCount > REVIEW_CONSTRAINTS.maxReactionTags) {
    return {
      ok: false,
      sanitizedAuthorName: cleanName,
      sanitizedContent: cleanContent,
      errorMessage: `Puedes elegir un máximo de ${REVIEW_CONSTRAINTS.maxReactionTags} etiquetas editoriales.`,
    };
  }

  return {
    ok: true,
    sanitizedAuthorName: cleanName,
    sanitizedContent: cleanContent,
  };
}
