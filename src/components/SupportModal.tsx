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
import {
  getSupportConfig,
  prefersPeruSupportTab,
  SUPPORT_TIERS_PEN,
  SUPPORT_TIERS_USD,
  type SupportTier,
} from '../config/support';
import { generateQrMatrix } from '../utils/supportQrMatrix';

export interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

type SupportTab = 'pe' | 'intl';

function TierPicker({
  tiers,
  selectedId,
  onSelect,
}: {
  tiers: SupportTier[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-[#6B665E]">
        Aporte simbólico sugerido (opcional)
      </span>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {tiers.map((tier) => {
          const active = tier.id === selectedId;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(tier.id)}
              className={`text-left p-2.5 sm:p-3 rounded-xl border transition-colors ${
                active
                  ? 'bg-[#1A1917] text-[#FAF8F5] border-[#1A1917]'
                  : 'bg-[#F3EFE8] text-[#1A1917] border-[#E6DFD3] hover:border-[#B45335]'
              }`}
            >
              <span className="font-serif text-lg font-medium block tabular-nums">
                {tier.label}
              </span>
              <span
                className={`hidden sm:block text-[11px] leading-snug mt-0.5 ${
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
  );
}

function QrBlock({
  matrix,
  label,
}: {
  matrix: boolean[][];
  label: string;
}) {
  const qrSize = matrix.length;
  return (
    <div className="shrink-0 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#DFD5C5] shadow-xs">
      <svg
        viewBox={`0 0 ${qrSize + 4} ${qrSize + 4}`}
        className="w-28 h-28 sm:w-32 sm:h-32 block"
        role="img"
        aria-label={label}
      >
        <rect width={qrSize + 4} height={qrSize + 4} fill="#FAF8F5" rx="2" />
        {matrix.map((row, rIdx) =>
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
  );
}

export function SupportModal({ open, onClose }: SupportModalProps) {
  const support = useMemo(() => getSupportConfig(), []);
  const [tab, setTab] = useState<SupportTab>(() =>
    prefersPeruSupportTab() ? 'pe' : 'intl',
  );
  const [selectedTierId, setSelectedTierId] = useState<string>('cuaderno');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedPen =
    SUPPORT_TIERS_PEN.find((tier) => tier.id === selectedTierId) ?? SUPPORT_TIERS_PEN[1];
  const selectedUsd =
    SUPPORT_TIERS_USD.find((tier) => tier.id === selectedTierId) ?? SUPPORT_TIERS_USD[1];

  const yapeQr = useMemo(
    () =>
      support.yapeAvailable
        ? generateQrMatrix(`${support.yapeQrPayload}:${selectedPen.amount}`)
        : null,
    [support.yapeAvailable, support.yapeQrPayload, selectedPen.amount],
  );
  const plinQr = useMemo(
    () =>
      support.plinAvailable
        ? generateQrMatrix(`${support.plinQrPayload}:${selectedPen.amount}`)
        : null,
    [support.plinAvailable, support.plinQrPayload, selectedPen.amount],
  );

  const hasInternational = Boolean(support.paypalUrl || support.kofiUrl || support.bmcUrl);

  useEffect(() => {
    if (!open) return;
    setCopiedKey(null);
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = async (key: 'yape' | 'plin', digits: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(digits);
      }
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2600);
    } catch {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2600);
    }
  };

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
        className="w-full max-w-2xl bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#F3EFE8] border-b border-[#E6DFD3]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#4A5D4E]">
            <Heart className="w-4 h-4 text-[#D97757]" aria-hidden="true" />
            <span>Apoyo voluntario · {BRAND_CONFIG.name}</span>
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

        <div className="overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <h2
              id="support-modal-title"
              className="font-serif text-2xl sm:text-3xl font-medium text-[#1A1917]"
            >
              Ayuda a que los libros sigan siendo libres
            </h2>
            <p className="text-sm text-[#6B665E] leading-relaxed">
              {BRAND_CONFIG.name} no tiene muros de pago ni publicidad invasiva. Tu aporte
              voluntario sostiene el servidor y la curaduría editorial, desde Perú o desde
              cualquier otro país.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Origen de la donación"
            className="grid grid-cols-2 p-1 rounded-xl bg-[#F3EFE8] border border-[#E6DFD3]"
          >
            <button
              type="button"
              role="tab"
              id="support-tab-pe"
              aria-controls="support-panel-pe"
              aria-selected={tab === 'pe'}
              data-testid="support-tab-pe"
              onClick={() => setTab('pe')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'pe'
                  ? 'bg-[#FAF8F5] text-[#1A1917] shadow-sm'
                  : 'text-[#6B665E] hover:text-[#1A1917]'
              }`}
            >
              Desde Perú
            </button>
            <button
              type="button"
              role="tab"
              id="support-tab-intl"
              aria-controls="support-panel-intl"
              aria-selected={tab === 'intl'}
              data-testid="support-tab-intl"
              onClick={() => setTab('intl')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'intl'
                  ? 'bg-[#FAF8F5] text-[#1A1917] shadow-sm'
                  : 'text-[#6B665E] hover:text-[#1A1917]'
              }`}
            >
              Desde otro país
            </button>
          </div>

          {tab === 'pe' ? (
            <div
              id="support-panel-pe"
              role="tabpanel"
              aria-labelledby="support-tab-pe"
              className="space-y-4"
            >
              <TierPicker
                tiers={SUPPORT_TIERS_PEN}
                selectedId={selectedTierId}
                onSelect={setSelectedTierId}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <PeruChannel
                  brand="Yape"
                  brandClass="text-[#742284]"
                  holder={support.yapeHolderName}
                  available={support.yapeAvailable}
                  phoneDisplay={support.yapePhoneDisplay}
                  suggestion={selectedPen.label}
                  qr={yapeQr}
                  copied={copiedKey === 'yape'}
                  testId="yape"
                  onCopy={() => void handleCopy('yape', support.yapePhoneDigits)}
                />
                <PeruChannel
                  brand="Plin"
                  brandClass="text-[#0F766E]"
                  holder={support.yapeHolderName}
                  available={support.plinAvailable}
                  phoneDisplay={support.plinPhoneDisplay}
                  suggestion={selectedPen.label}
                  qr={plinQr}
                  copied={copiedKey === 'plin'}
                  testId="plin"
                  onCopy={() => void handleCopy('plin', support.plinPhoneDigits)}
                />
              </div>
            </div>
          ) : (
            <div
              id="support-panel-intl"
              role="tabpanel"
              aria-labelledby="support-tab-intl"
              className="space-y-4"
            >
              <TierPicker
                tiers={SUPPORT_TIERS_USD}
                selectedId={selectedTierId}
                onSelect={setSelectedTierId}
              />

              <div className="rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-medium text-[#1A1917]">
                    Aporte internacional
                  </h3>
                  <p className="text-xs text-[#6B665E] leading-relaxed">
                    Sugerencia actual:{' '}
                    <strong className="text-[#1A1917]">{selectedUsd.label}</strong>. El monto
                    se confirma en PayPal, Ko-fi o Buy Me a Coffee.
                  </p>
                </div>

                {hasInternational ? (
                  <div className="space-y-2.5">
                    {support.paypalUrl && (
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
                    )}
                    {support.kofiUrl && (
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
                    )}
                    {support.bmcUrl && (
                      <a
                        href={support.bmcUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="support-bmc-link"
                        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium bg-[#F3EFE8] border border-[#E6DFD3] text-[#1A1917] rounded-xl hover:border-[#B45335] transition-colors"
                      >
                        <span>Buy Me a Coffee</span>
                        <ExternalLink className="w-4 h-4 text-[#6B665E]" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p
                    className="text-sm text-[#6B665E] italic"
                    data-testid="support-intl-soon"
                  >
                    Próximamente
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="flex items-center gap-2 text-xs text-[#6B665E]">
            <ShieldCheck className="w-4 h-4 text-[#4A5D4E] shrink-0" aria-hidden="true" />
            Cada obra en {BRAND_CONFIG.name} seguirá siendo gratuita para descargar y leer
            sin condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}

function PeruChannel({
  brand,
  brandClass,
  holder,
  available,
  phoneDisplay,
  suggestion,
  qr,
  copied,
  testId,
  onCopy,
}: {
  brand: string;
  brandClass: string;
  holder: string;
  available: boolean;
  phoneDisplay: string;
  suggestion: string;
  qr: boolean[][] | null;
  copied: boolean;
  testId: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-[#F3EFE8] p-4 flex flex-col items-center sm:items-start gap-3">
      {available && qr ? (
        <div data-testid={`${testId}-qr-svg`}>
          <QrBlock
            matrix={qr}
            label={`Código QR de ${brand} para apoyar a ${BRAND_CONFIG.name}`}
          />
        </div>
      ) : (
        <div
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-dashed border-[#DFD5C5] bg-[#FAF8F5] flex items-center justify-center"
          aria-hidden="true"
        >
          <QrCode className="w-8 h-8 text-[#C4B496]" />
        </div>
      )}

      <div className="space-y-2 text-center sm:text-left w-full min-w-0">
        <div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${brandClass}`}>
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            {brand} · Perú
          </span>
          <h3 className="font-serif text-lg font-medium text-[#1A1917] mt-0.5">{holder}</h3>
          <p className="text-xs text-[#6B665E] mt-1">
            Sugerencia: <strong className="text-[#1A1917]">{suggestion}</strong>
          </p>
        </div>

        {available ? (
          <div className="pt-0.5 space-y-2">
            <p
              className="font-mono text-base font-semibold text-[#1A1917] tabular-nums"
              data-testid={`${testId}-phone-number`}
            >
              {phoneDisplay}
            </p>
            <button
              type="button"
              data-testid={`copy-${testId}-number-btn`}
              onClick={onCopy}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#8FA893]" aria-hidden="true" />
                  ¡Número copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  Copiar número {brand}
                </>
              )}
            </button>
          </div>
        ) : (
          <p
            className="text-sm text-[#6B665E] italic pt-1"
            data-testid={`${testId}-phone-number`}
          >
            Próximamente
          </p>
        )}
      </div>
    </div>
  );
}
