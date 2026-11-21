/**
 * Publicaciones en la fan page de LeerEsPensar: un lector comparte que leyó un libro y,
 * con la aprobación de Frank, se publica en Facebook con la portada, un resumen corto
 * y su nombre ("María G."). Lo usan la página y las funciones de Cloudflare.
 */

export interface FanPagePost {
  id: string;
  libroId: string;
  titulo: string;
  autor: string;
  /** "María G." (ver formatGratitudeName). */
  nombre: string;
  /** Lo que el lector quiso decir del libro (opcional, corto). */
  comentario: string;
  /** Fecha AAAA-MM-DD en que lo compartió. */
  fecha: string;
}

export const COMMENT_MAX = 240;
export const SUMMARY_MAX = 420;

/** Texto plano, una sola línea, sin enlaces ni etiquetas (para no publicar spam). */
export function cleanShortText(value: string, max: number): string {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Citas clásicas sobre la lectura que acompañan cada publicación (una según el libro y el lector). */
export const READING_QUOTES: ReadonlyArray<readonly [string, string]> = [
  ['El que lee mucho y anda mucho, ve mucho y sabe mucho.', 'Miguel de Cervantes'],
  ['Una casa sin libros es como un cuerpo sin alma.', 'Cicerón'],
  ['La lectura de todos los buenos libros es como una conversación con las mejores mentes de los siglos pasados.', 'René Descartes'],
  ['La lectura es a la mente lo que el ejercicio es al cuerpo.', 'Joseph Addison'],
  ['La lectura hace al hombre completo.', 'Francis Bacon'],
  ['No hay fragata como un libro para llevarnos a tierras lejanas.', 'Emily Dickinson'],
  ['Leer sin reflexionar es como comer sin digerir.', 'Edmund Burke'],
  ['Los libros son las abejas que llevan el polen de una inteligencia a otra.', 'James Russell Lowell'],
];

export function readingQuoteFor(seed: string): readonly [string, string] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return READING_QUOTES[h % READING_QUOTES.length];
}

/** Texto que acompaña la foto en Facebook. */
export function buildFanPageCaption(post: Pick<FanPagePost, 'titulo' | 'autor' | 'nombre' | 'comentario'>, resumen: string): string {
  const autor = post.autor && post.autor !== 'Autor desconocido' ? `, de ${post.autor}` : '';
  const lineas = [`📖 ${post.nombre} leyó «${post.titulo}»${autor}.`];
  const r = cleanShortText(resumen, SUMMARY_MAX);
  if (r) lineas.push('', r);
  const c = cleanShortText(post.comentario, COMMENT_MAX);
  if (c) lineas.push('', `«${c}» — ${post.nombre}`);
  const [cita, quien] = readingQuoteFor(`${post.titulo}|${post.nombre}`);
  const primerNombre = post.nombre.split(' ')[0];
  lineas.push('', `Gracias, ${primerNombre}, por regalarte el tiempo de leer y aprender. 🌿`, `«${cita}» — ${quien}`);
  lineas.push('', '¿Ya lo leíste? Está gratis en la biblioteca del grupo LeerEsPensar.', '', '#LeerEsPensar #ClubDeLectura #Leer');
  return lineas.join('\n');
}
