export type BookMood =
  | 'Contemplativo'
  | 'Melancólico'
  | 'Lúcido'
  | 'Onírico'
  | 'Íntimo'
  | 'Inquietante';

export type BookGenre =
  | 'Cuento filosófico'
  | 'Ensayo literario'
  | 'Realismo fantástico'
  | 'Novela existencial'
  | 'Novela lírica'
  | 'Poesía'
  | 'Realismo mágico'
  | 'Novela gótica'
  | 'Novela clásica'
  | 'Misterio'
  | 'Fantasía';

export type BookCoverStyle =
  | 'cloth-frame'
  | 'half-bound'
  | 'linen-medallion'
  | 'arch-monogram';

export interface Author {
  id: string;
  name: string;
  country: string;
  lifespan: string;
  shortBio: string;
}

export interface CoverTheme {
  spineColor: string;
  paperTint: string;
  inkColor: string;
  accentColor: string;
  secondaryTextColor?: string;
  style?: BookCoverStyle;
}

export interface BookIndexEntry {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authorId: string;
  authorName: string;
  genre: BookGenre;
  moods: BookMood[];
  publicationYear: number;
  pageCount: number;
  readingTimeMinutes: number;
  language: 'es';
  coverTheme: CoverTheme;
  /** "El Gancho": resumen introductorio que seduce al lector */
  hookSummary: string;
  /** "Lo que te vas a llevar": 3 aprendizajes o sensaciones clave */
  takeaways: string[];
  /** "Primer Sorbo": primer párrafo real / fragmento de apertura */
  firstSip: string;
  /** Ruta diferida del PDF: se carga únicamente cuando el usuario abre el lector */
  pdfUrl: string;
  pdfSizeBytes: number;
  featured?: boolean;
  sourceUrl?: string;
}

export interface Book extends BookIndexEntry {
  author: Author;
  chapters: Array<{
    title: string;
    paragraphs: string[];
  }>;
}

export type ReviewReactionTag =
  | 'Me cambió la perspectiva'
  | 'Lectura imprescindible'
  | 'Prosa hipnótica'
  | 'Ideal para una tarde de lluvia'
  | 'Breve pero inolvidable';

export interface Review {
  id: string;
  bookId: string;
  authorId: string;
  authorName: string;
  content: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reactionTags: ReviewReactionTag[];
  createdAt: string;
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  completed: boolean;
  startedAt: string;
  lastReadAt: string;
  completedAt?: string;
}

export type ReadingProgressMap = Record<string, ReadingProgress>;

export type PdfValidationErrorCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'INVALID_MAGIC_BYTES'
  | 'TRUNCATED_FILE'
  | 'ZERO_PAGES'
  | 'ENCRYPTED_PDF'
  | 'CORRUPTED_STRUCTURE'
  | 'READ_ERROR';

export interface PdfValidationDetails {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  pdfVersion: string | null;
  pageCount: number | null;
  hasEndOfFileMarker: boolean;
  containsActiveScripts: boolean;
  sha256: string | null;
}

export interface PdfValidationResult {
  valid: boolean;
  errorCode?: PdfValidationErrorCode;
  userMessage: string;
  technicalReason?: string;
  canReport: boolean;
  details: PdfValidationDetails;
}

export interface CatalogQuery {
  search?: string;
  genre?: BookGenre | 'Todos';
  authorId?: string | 'Todos';
  mood?: BookMood | 'Todos';
  page?: number;
  pageSize?: number;
}

export interface PaginatedCatalogResult {
  items: BookIndexEntry[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
