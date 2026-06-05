"use client";

import { X, MapPin, Phone, User, FileText } from "@/components/ui/icons";

export interface ProjectInfo {
  investmentStreet?: string | null;
  investmentCity?: string | null;
  investmentPostalCode?: string | null;
  investmentCountry?: string | null;
  designerContactName?: string | null;
  designerContactPhone?: string | null;
  investorContactName?: string | null;
  investorContactPhone?: string | null;
  projectNotes?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectTitle: string;
  info: ProjectInfo;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function ContractorProjectInfoSidebar({ open, onClose, projectTitle, info }: Props) {
  const address = [
    info.investmentStreet,
    info.investmentPostalCode && info.investmentCity
      ? `${info.investmentPostalCode} ${info.investmentCity}`
      : info.investmentCity || info.investmentPostalCode,
    info.investmentCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const hasAddress = !!(info.investmentStreet || info.investmentCity || info.investmentPostalCode || info.investmentCountry);
  const hasDesigner = !!(info.designerContactName || info.designerContactPhone);
  const hasInvestor = !!(info.investorContactName || info.investorContactPhone);
  const hasNotes = !!info.projectNotes;
  const isEmpty = !hasAddress && !hasDesigner && !hasInvestor && !hasNotes;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Informacje o projekcie</p>
            <p className="font-semibold truncate">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Brak informacji o projekcie.
            </p>
          ) : (
            <>
              {hasAddress && (
                <section className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MapPin size={12} />
                    Adres inwestycji
                  </div>
                  <p className="text-sm leading-relaxed">{address}</p>
                </section>
              )}

              {hasDesigner && (
                <section className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User size={12} />
                    Kontakt do projektanta
                  </div>
                  <div className="space-y-2">
                    <Row label="Imię i nazwisko" value={info.designerContactName} />
                    {info.designerContactPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <a
                          href={`tel:${info.designerContactPhone}`}
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 mt-0.5"
                        >
                          <Phone size={12} />
                          {info.designerContactPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {hasInvestor && (
                <section className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User size={12} />
                    Kontakt do inwestora
                  </div>
                  <div className="space-y-2">
                    <Row label="Imię i nazwisko" value={info.investorContactName} />
                    {info.investorContactPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <a
                          href={`tel:${info.investorContactPhone}`}
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 mt-0.5"
                        >
                          <Phone size={12} />
                          {info.investorContactPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {hasNotes && (
                <section className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <FileText size={12} />
                    Opis
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{info.projectNotes}</p>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
