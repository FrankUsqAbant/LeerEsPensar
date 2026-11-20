import { BRAND_CONFIG } from './brand';
import { isSafeHttpUrl, sanitizePlainText } from '../utils/sanitization';

export interface SupportConfig {
  yapeHolderName: string;
  yapePhoneDisplay: string;
  yapePhoneDigits: string;
  yapeQrPayload: string;
  yapeAvailable: boolean;
  plinPhoneDisplay: string;
  plinPhoneDigits: string;
  plinQrPayload: string;
  plinAvailable: boolean;
  paypalUrl: string;
  kofiUrl: string;
  bmcUrl: string;
}

export interface SupportTier {
  id: string;
  amount: number;
  label: string;
  description: string;
}

export const SUPPORT_TIERS_PEN: SupportTier[] = [
  {
    id: 'cafe',
    amount: 5,
    label: 'S/ 5',
    description: 'Un café para sostener el servidor libre',
  },
  {
    id: 'cuaderno',
    amount: 10,
    label: 'S/ 10',
    description: 'Edición y revisión de un nuevo título en PDF',
  },
  {
    id: 'coleccion',
    amount: 25,
    label: 'S/ 25',
    description: 'Impulsa la colección abierta mensual',
  },
];

export const SUPPORT_TIERS_USD: SupportTier[] = [
  {
    id: 'cafe',
    amount: 3,
    label: '$3',
    description: 'Un café para sostener el servidor libre',
  },
  {
    id: 'cuaderno',
    amount: 5,
    label: '$5',
    description: 'Edición y revisión de un nuevo título en PDF',
  },
  {
    id: 'coleccion',
    amount: 10,
    label: '$10',
    description: 'Impulsa la colección abierta mensual',
  },
];

function readEnvString(key: string): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const raw = metaEnv?.[key];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return '';
}

function readSafeUrl(key: string): string {
  const raw = readEnvString(key);
  return raw && isSafeHttpUrl(raw) ? raw : '';
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function prefersPeruSupportTab(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Lima') {
      return true;
    }
  } catch {
    // ignore missing Intl
  }
  const lang = (navigator.language || '').toLowerCase();
  return lang === 'es-pe' || lang.startsWith('es-pe');
}

export function getSupportConfig(): SupportConfig {
  const yapeHolderName = sanitizePlainText(
    readEnvString('VITE_YAPE_HOLDER') || BRAND_CONFIG.name,
    80,
  );

  const yapePhoneDisplay = sanitizePlainText(readEnvString('VITE_YAPE_PHONE'), 24);
  const yapePhoneDigits = normalizePhoneDigits(yapePhoneDisplay).replace(/^\+51/, '');
  const yapeAvailable = yapePhoneDigits.length >= 6;

  const plinPhoneDisplay = sanitizePlainText(readEnvString('VITE_PLIN_PHONE'), 24);
  const plinPhoneDigits = normalizePhoneDigits(plinPhoneDisplay).replace(/^\+51/, '');
  const plinAvailable = plinPhoneDigits.length >= 6;

  return {
    yapeHolderName,
    yapePhoneDisplay,
    yapePhoneDigits,
    yapeQrPayload: yapeAvailable ? `YAPE:PE:${yapePhoneDigits}:${BRAND_CONFIG.name}` : '',
    yapeAvailable,
    plinPhoneDisplay,
    plinPhoneDigits,
    plinQrPayload: plinAvailable ? `PLIN:PE:${plinPhoneDigits}:${BRAND_CONFIG.name}` : '',
    plinAvailable,
    paypalUrl: readSafeUrl('VITE_PAYPAL_URL'),
    kofiUrl: readSafeUrl('VITE_KOFI_URL'),
    bmcUrl: readSafeUrl('VITE_BMC_URL'),
  };
}
