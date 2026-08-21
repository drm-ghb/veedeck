import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function TrialExpiredLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Material Symbols Rounded';
          font-style: normal;
          font-weight: 100 700;
          font-display: block;
          src: url('/fonts/material-symbols-rounded.woff2') format('woff2');
        }
        .material-symbols-rounded {
          font-family: "Material Symbols Rounded", sans-serif;
          font-optical-sizing: auto;
          font-variation-settings: "FILL" 0, "wght" 300, "GRAD" 0, "opsz" 20;
          font-size: 20px;
          line-height: 1;
          display: inline-block;
          vertical-align: middle;
          user-select: none;
          flex-shrink: 0;
        }
      `}</style>
      {children}
    </>
  );
}
