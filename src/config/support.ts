import { isSafeHttpUrl } from '../utils/sanitization';

/**
 * Apoyo y redes de LeerEsPensar.
 * - Yape: QR real exportado desde la app (el contenido EMV no cabe en el generador propio).
 * - PayPal: enlace PayPal.Me; se puede sobrescribir con VITE_PAYPAL_URL.
 * - Redes: tarjeta digital del autor; su QR se genera en la página.
 */
export const YAPE_QR_SRC = '/assets/qr/yape.png';

const DEFAULT_PAYPAL_URL = 'https://paypal.me/FrankAbanto22';
export const SOCIAL_URL = 'https://frankusqabant.github.io';

function readEnvUrl(key: string): string {
  const env = (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {};
  const value = env[key];
  return typeof value === 'string' && isSafeHttpUrl(value.trim()) ? value.trim() : '';
}

export function getPaypalUrl(): string {
  return readEnvUrl('VITE_PAYPAL_URL') || DEFAULT_PAYPAL_URL;
}

/** Texto corto para mostrar un enlace sin "https://". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
