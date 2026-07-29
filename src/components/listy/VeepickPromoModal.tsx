"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "@/components/ui/icons";

const CSS = `
@keyframes vp-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@keyframes vp-fade { from { opacity: 0; } }
@keyframes vp-rise { from { opacity: 0; transform: translateY(10px); } }
.vp-dialog { animation: vp-pop .38s cubic-bezier(.2,.7,.25,1) both; }
.vp-fade { animation: vp-fade .3s ease both; }
.vp-rise { animation: vp-rise .4s cubic-bezier(.2,.7,.25,1) both; }
.vp-dialog {
  --vp-white: #ffffff;
  --vp-indigo-50: #EEF2FF;
}
html.dark .vp-dialog {
  --vp-white: var(--muted);
  --vp-indigo-50: rgba(79, 70, 229, 0.18);
}
@media (prefers-reduced-motion: reduce) {
  .vp-dialog, .vp-fade, .vp-rise { animation: none !important; }
}
@media (max-width: 600px) {
  .vp-stage { padding: 12px !important; }
  .vp-dialog { max-width: 100% !important; }
}
`;

const storageKey = (userId: string) => `veepick-promo-count:${userId}`;
const SHOW_EVERY = 3;

interface Props {
  userId: string;
  veepickConnected: boolean;
}

export default function VeepickPromoModal({ userId, veepickConnected }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (veepickConnected) return;
    const raw = localStorage.getItem(storageKey(userId));
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;
    localStorage.setItem(storageKey(userId), String(next));
    // Show on 1st, 4th, 7th… visit (every SHOW_EVERY visits starting from 1)
    if (next % SHOW_EVERY === 1) {
      setVisible(true);
    }
  }, [userId, veepickConnected]);

  if (!visible) return null;

  const primaryBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    font: "inherit", fontSize: 14, fontWeight: 600,
    padding: "11px 22px", borderRadius: 11, cursor: "pointer",
    border: "none", color: "#fff",
    background: "linear-gradient(140deg, #4F46E5, #6B63F0)",
    boxShadow: "0 6px 16px -6px rgba(79,70,229,0.6)",
    transition: "filter .15s, transform .15s",
    textDecoration: "none",
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Overlay */}
      <div
        className="vp-stage fixed inset-0 z-50 flex items-center justify-center"
        style={{ padding: 32, background: "rgba(24,27,50,0.34)", backdropFilter: "blur(4px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Wtyczka veepick"
      >
        {/* Dialog */}
        <div
          className="vp-dialog w-full bg-background border border-border overflow-hidden relative"
          style={{
            maxWidth: 480,
            borderRadius: 20,
            boxShadow: "0 40px 90px -30px rgba(30,27,75,0.55), 0 12px 34px -18px rgba(79,70,229,0.35)",
            padding: "32px 32px 28px",
          }}
        >
          {/* Close */}
          <button
            onClick={() => setVisible(false)}
            aria-label="Zamknij"
            className="absolute top-4 right-4 grid place-items-center"
            style={{
              width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--muted-foreground)",
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "var(--muted)"; b.style.color = "var(--foreground)";
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent"; b.style.color = "var(--muted-foreground)";
            }}
          >
            <X size={19} />
          </button>

          {/* Content */}
          <div className="vp-fade flex flex-col items-center text-center" style={{ gap: 0 }}>
            {/* Icon */}
            <div
              className="vp-rise"
              style={{
                width: 72, height: 72, borderRadius: 18, overflow: "hidden",
                boxShadow: "0 18px 40px -14px rgba(79,70,229,0.65)",
                marginBottom: 20, flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vee-icon.png" alt="veedeck" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            {/* Kicker */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--primary)", marginBottom: 8,
            }}>
              Wtyczka do przeglądarki
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              marginBottom: 12,
            }}>
              Twórz listy znacznie szybciej
            </h2>

            {/* Description */}
            <p style={{
              fontSize: 15, color: "var(--muted-foreground)", lineHeight: 1.65,
              maxWidth: 360, marginBottom: 24,
            }}>
              Wtyczka <strong style={{ color: "var(--foreground)", fontWeight: 600 }}>veepick</strong> pozwala
              dodawać produkty z każdego sklepu internetowego bezpośrednio do list zakupowych —
              bez kopiowania i wklejania linków.
            </p>

            {/* Feature chips */}
            <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 28 }}>
              {[
                "Kliknij i dodaj produkt",
                "Automatyczne ceny i zdjęcia",
                "Działa na każdym sklepie",
              ].map((text, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "var(--vp-white)", border: "1px solid var(--border)",
                    borderRadius: 999, padding: "7px 13px",
                    fontSize: 12.5, fontWeight: 600, color: "var(--foreground)",
                  }}
                >
                  <span style={{ color: "var(--primary)", display: "flex" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {text}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center" style={{ gap: 12 }}>
              <Link
                href="/ustawienia/wtyczka"
                style={primaryBtn}
                onClick={() => setVisible(false)}
                onMouseEnter={e => {
                  const a = e.currentTarget as HTMLAnchorElement;
                  a.style.filter = "brightness(1.06)"; a.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  const a = e.currentTarget as HTMLAnchorElement;
                  a.style.filter = "none"; a.style.transform = "none";
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Pobierz wtyczkę
              </Link>
              <button
                onClick={() => setVisible(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer", font: "inherit",
                  fontSize: 13.5, color: "var(--muted-foreground)", fontWeight: 500,
                  padding: "8px 4px", transition: "color .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)"; }}
              >
                Może później
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
