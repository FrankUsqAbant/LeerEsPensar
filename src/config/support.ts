import { BRAND_CONFIG } from './brand';
import { isSafeHttpUrl, sanitizePlainText } from '../utils/sanitization';

export interface SupportConfig {
  yapeHolderName: string;
  yapePhoneDisplay: string;
  yapePhoneDigits: string;
  yapeQrPayload: string;
  paypalUrl: string;
  kofiUrl: string;
}

export interface SupportTier {
  id: string;
  amountPen: number;
  label: string;
  description: string;
}

export const SUPPORT_TIERS_PEN: SupportTier[] = [
  {
    id: 'cafe',
    amountPen: 5,
    label: 'S/ 5',
    description: 'Un café para sostener el servidor libre',
  },
  {
    id: 'cuaderno',
    amountPen: 10,
    label: 'S/ 10',
    description: 'Edición y revisión de un nuevo título en PDF',
  },
  {
    id: 'coleccion',
    amountPen: 25,
    label: 'S/ 25',
    description: 'Impulsa la colección abierta mensual',
  },
];

function readEnvString(key: string, fallback: string): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const raw = metaEnv?.[key];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return fallback;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function getSupportConfig(): SupportConfig {
  const yapeHolderName = sanitizePlainText(
    readEnvString('VITE_YAPE_HOLDER', `${BRAND_CONFIG.name} · Proyecto Editorial Libre`),
    80,
  );
  const yapePhoneDisplay = sanitizePlainText(
    readEnvString('VITE_YAPE_PHONE', '+51 987 654 321'),
    24,
  );
  const yapePhoneDigits = normalizePhoneDigits(yapePhoneDisplay).replace(/^\+51/, '');

  const rawPaypal = readEnvString(
    'VITE_PAYPAL_URL',
    'https://www.paypal.com/donate',
  );
  const rawKofi = readEnvString(
    'VITE_KOFI_URL',
    'https://ko-fi.com/',
  );

  const paypalUrl = isSafeHttpUrl(rawPaypal)
    ? rawPaypal
    : 'https://www.paypal.com/donate';
  const kofiUrl = isSafeHttpUrl(rawKofi)
    ? rawKofi
    : 'https://ko-fi.com/';

  // Payload legible compatible con lectores QR y verificación editorial
  const yapeQrPayload = `YAPE:PE:${yapePhoneDigits}:${BRAND_CONFIG.name}`;

  return {
    yapeHolderName,
    yapePhoneDisplay,
    yapePhoneDigits,
    yapeQrPayload,
    paypalUrl,
    kofiUrl,
  };
}
