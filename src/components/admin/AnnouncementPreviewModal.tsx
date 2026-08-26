"use client";

import { Megaphone } from "lucide-react";
import { X } from "@/components/ui/icons";

const CSS = `
@keyframes ann-pop { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@keyframes ann-fade { from { opacity: 0; } }
.ann-dialog { animation: ann-pop .38s cubic-bezier(.2,.7,.25,1) both; }
.ann-overlay { animation: ann-fade .3s ease both; }
@media (prefers-reduced-motion: reduce) {
  .ann-dialog, .ann-overlay { animation: none !important; }
}
@media (max-width: 640px) {
  .ann-dialog { max-width: calc(100vw - 32px) !important; max-height: 80dvh !important; }
}
`;

export default function AnnouncementPreviewModal({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        className="ann-overlay fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          padding: 16,
          background: "rgba(24,27,50,0.34)",
          backdropFilter: "blur(4px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="ann-dialog w-full bg-background border border-border flex flex-col overflow-hidden"
          style={{
            maxWidth: 520,
            maxHeight: "85dvh",
            borderRadius: 20,
            boxShadow:
              "0 40px 90px -30px rgba(30,27,75,0.55), 0 12px 34px -18px rgba(79,70,229,0.35)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center"
            style={{ gap: 14, padding: "22px 24px 0" }}
          >
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(140deg, #4F46E5, #6B63F0)",
                color: "#fff",
                boxShadow: "0 8px 20px -8px rgba(79,70,229,0.6)",
              }}
            >
              <Megaphone size={21} />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="truncate"
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "var(--foreground)",
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {title || "Bez tytułu"}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Zamknij"
              className="grid place-items-center shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "var(--muted-foreground)",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background = "var(--muted)";
                b.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background = "transparent";
                b.style.color = "var(--muted-foreground)";
              }}
            >
              <X size={19} />
            </button>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ padding: "18px 28px 20px", scrollbarGutter: "stable" }}
          >
            <div
              className="announcement-content"
              style={{
                fontSize: 14.5,
                lineHeight: 1.65,
                color: "var(--muted-foreground)",
              }}
              dangerouslySetInnerHTML={{ __html: content || "<p>Brak treści</p>" }}
            />
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end"
            style={{
              gap: 10,
              padding: "14px 24px 20px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              onClick={onClose}
              className="inline-flex items-center"
              style={{
                gap: 7,
                font: "inherit",
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 11,
                cursor: "pointer",
                border: "none",
                color: "#fff",
                background: "linear-gradient(140deg, #4F46E5, #6B63F0)",
                boxShadow: "0 6px 16px -6px rgba(79,70,229,0.6)",
                transition: "filter .15s, transform .15s",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.filter = "brightness(1.05)";
                b.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.filter = "none";
                b.style.transform = "none";
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
