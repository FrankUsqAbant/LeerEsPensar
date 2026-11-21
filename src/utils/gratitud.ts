/**
 * Muro de gratitud: nombres de quienes apoyan la biblioteca.
 * Se guarda SOLO el primer nombre y la inicial del apellido ("María G."), nunca el apellido completo.
 * Lo usan la página y las funciones de Cloudflare (misma validación en ambos lados).
 */

export interface GratitudeEntry {
  id: string;
  nombre: string;
  /** Fecha AAAA-MM-DD en que se registró. */
  fecha: string;
}

/** Letras (con tildes y ñ), apóstrofo y guion. */
const SOLO_LETRAS = /^[\p{L}][\p{L}'’-]*$/u;

/** "ana-lucía" → "Ana-Lucía": mayúscula al inicio de cada parte de un nombre compuesto. */
function capitalizar(palabra: string): string {
  return palabra
    .toLocaleLowerCase('es')
    .split('-')
    .map((parte) => parte.charAt(0).toLocaleUpperCase('es') + parte.slice(1))
    .join('-');
}

/**
 * "  maría josé " + "gonzález pérez" → "María G.".
 * Devuelve null si no parece un nombre (números, símbolos, vacío o demasiado largo).
 */
export function formatGratitudeName(nombre: string, apellido: string): string | null {
  const primero = (nombre ?? '').trim().split(/\s+/)[0] ?? '';
  const apellidoLimpio = (apellido ?? '').trim().split(/\s+/)[0] ?? '';
  if (!primero || !apellidoLimpio) return null;
  if (primero.length > 20 || apellidoLimpio.length > 30) return null;
  if (!SOLO_LETRAS.test(primero) || !SOLO_LETRAS.test(apellidoLimpio)) return null;
  const inicial = apellidoLimpio.charAt(0).toLocaleUpperCase('es');
  return `${capitalizar(primero)} ${inicial}.`;
}

/** Frases de agradecimiento (una por donación, al azar). {nombre} = primer nombre. */
export const GRATITUDE_PHRASES: readonly string[] = [
  'Gracias, {nombre}. Cada libro que alguien abra aquí también lleva un poco de ti.',
  '{nombre}, gracias por mantener encendida la lámpara de esta biblioteca.',
  'Gracias, {nombre}. Gracias a ti, más páginas encuentran a sus lectores.',
  '{nombre}, tu aporte se convierte en libros para todo el grupo. Gracias.',
  'Gracias, {nombre}. Los buenos libros se sostienen con buenas personas.',
];

export function gratitudePhrase(fullName: string, seed = Math.random()): string {
  const primero = fullName.split(' ')[0] ?? fullName;
  const frase = GRATITUDE_PHRASES[Math.floor(seed * GRATITUDE_PHRASES.length) % GRATITUDE_PHRASES.length];
  return frase.replace('{nombre}', primero);
}
