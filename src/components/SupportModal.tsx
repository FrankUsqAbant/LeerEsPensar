import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Coffee,
  Copy,
  ExternalLink,
  Heart,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { getSupportConfig, SUPPORT_TIERS_PEN } from '../config/support';
import { generateQrMatrix } from '../utils/supportQrMatrix';

export interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  const support = useMemo(() => getSupportConfig(), []);
  const [selectedTierId, setSelectedTierId] = useState<string>('cuaderno');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedTier =
    SUPPORT_TIERS_PEN.find((tier) => tier.id === selectedTierId) ?? SUPPORT_TIERS_PEN[1];

  const qrMatrix = useMemo(
    () => generateQrMatrix(`${support.yapeQrPayload}:${selectedTier.amountPen}`),
    [support.yapeQrPayload, selectedTier.amountPen],
  );

  useEffect(() => {
    if (!open) return;
    setCopiedPhone(false);
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyPhone = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(support.yapePhoneDigits);
      }
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2600);
    } catch {
      // Fallback para contextos sin permisos de portapapeles
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 2600);
    }
  };

  const qrSize = qrMatrix.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      data-testid="support-modal"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1A1917]/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#F3EFE8] border-b border-[#E6DFD3]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#4A5D4E]">
            <Heart className="w-4 h-4 text-[#D97757]" aria-hidden="true" />
            <span>Sostenibilidad comunitaria · {BRAND_CONFIG.name}</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de apoyo editorial"
            className="p-2 text-[#6B665E] hover:text-[#1A1917] rounded-lg hover:bg-[#E6DFD3]/60 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2
              id="support-modal-title"
              className="font-serif text-2xl sm:text-3xl font-medium text-[#1A1917]"
            >
              Ayuda a que los libros sigan siendo libres
            </h2>
            <p className="text-sm text-[#6B665E] leading-relaxed">
              {BRAND_CONFIG.name} no tiene muros de pago ni publicidad invasiva. Tu aporte voluntario
              financia el servidor, la curaduría editorial y la verificación continua de ejemplares PDF.
            </p>
          </div>

          {/* Selector opcional de aporte sugerido */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#6B665E]">
              Aporte simbólico sugerido (opcional)
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {SUPPORT_TIERS_PEN.map((tier) => {
                const active = tier.id === selectedTierId;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      active
                        ? 'bg-[#1A1917] text-[#FAF8F5] border-[#1A1917]'
                        : 'bg-[#F3EFE8] text-[#1A1917] border-[#E6DFD3] hover:border-[#B45335]'
                    }`}
                  >
                    <span className="font-serif text-lg font-medium block tabular-nums">
                      {tier.label}
                    </span>
                    <span
                      className={`text-[11px] leading-snug block mt-0.5 ${
                        active ? 'text-[#EAE3D7]' : 'text-[#6B665E]'
                      }`}
                    >
                      {tier.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dos canales claros: Yape Perú + Opciones internacionales */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Tarjeta Yape Perú */}
            <div className="md:col-span-7 rounded-2xl border border-[#E6DFD3] bg-[#F3EFE8] p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="shrink-0 bg-[#FAF8F5] p-3 rounded-xl border border-[#DFD5C5] shadow-xs">
                <svg
                  viewBox={`0 0 ${qrSize + 4} ${qrSize + 4}`}
                  className="w-36 h-36 block"
                  role="img"
                  aria-label={`Código QR de Yape para apoyar a ${BRAND_CONFIG.name}`}
                  data-testid="yape-qr-svg"
                >
                  <rect width={qrSize + 4} height={qrSize + 4} fill="#FAF8F5" rx="2" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((dark, cIdx) =>
                      dark ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + 2}
                          y={rIdx + 2}
                          width={1}
                          height={1}
                          fill="#1A1917"
                        />
                      ) : null,
                    ),
                  )}
                </svg>
              </div>

              <div className="space-y-3 text-center sm:text-left min-w-0 flex-1">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#742284]">
                    <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                    Yape · Perú
                  </span>
                  <h3 className="font-serif text-xl font-medium text-[#1A1917] mt-0.5">
                    {support.yapeHolderName}
                  </h3>
                  <p className="text-xs text-[#6B665E] mt-1">
                    Sugerencia actual: <strong className="text-[#1A1917]">{selectedTier.label}</strong> ·{' '}
                    Concepto «Apoyo {BRAND_CONFIG.name}»
                  </p>
                </div>

                <div className="pt-1 space-y-2">
                  <p
                    className="font-mono text-base font-semibold text-[#1A1917] tabular-nums"
                    data-testid="yape-phone-number"
                  >
                    {support.yapePhoneDisplay}
                  </p>
                  <button
                    type="button"
                    data-testid="copy-yape-number-btn"
                    onClick={() => void handleCopyPhone()}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-xs font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] transition-colors"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#8FA893]" aria-hidden="true" />
                        ¡Número copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copiar número Yape
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Aporte Internacional */}
            <div className="md:col-span-5 rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#4A5D4E]">
                  Desde cualquier país
                </p>
                <h3 className="font-serif text-xl font-medium text-[#1A1917]">
                  Aporte internacional
                </h3>
                <p className="text-xs text-[#6B665E] leading-relaxed">
                  Si lees desde fuera del Perú puedes colaborar mediante PayPal o invitando un café en Ko-fi.
                </p>
              </div>

              <div className="space-y-2.5">
                <a
                  href={support.paypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="support-paypal-link"
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium bg-[#F3EFE8] border border-[#E6DFD3] text-[#1A1917] rounded-xl hover:border-[#B45335] transition-colors"
                >
                  <span>Donar con PayPal</span>
                  <ExternalLink className="w-4 h-4 text-[#6B665E]" aria-hidden="true" />
                </a>

                <a
                  href={support.kofiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="support-kofi-link"
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium bg-[#4A5D4E] text-[#FAF8F5] rounded-xl hover:bg-[#3C4D40] transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Coffee className="w-4 h-4" aria-hidden="true" />
                    Invitar un café (Ko-fi)
                  </span>
                  <ExternalLink className="w-4 h-4 opacity-80" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-[#6B665E]">
            <ShieldCheck className="w-4 h-4 text-[#4A5D4E] shrink-0" aria-hidden="true" />
            Cada obra en {BRAND_CONFIG.name} seguirá siendo gratuita para descargar y leer sin condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}
