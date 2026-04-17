import type { Metadata } from "next";
import { Inter, DM_Sans, Story_Script, Lato, Nunito } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme";
import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
});

const storyScript = Story_Script({
  variable: "--font-story-script",
  subsets: ["latin"],
  weight: ["400"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["300"],
});

export const metadata: Metadata = {
  title: "veedeck – cały projekt w jednym miejscu",
  description: "Centralizuj feedback do renderów w jednym miejscu",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("veedeck-theme")?.value;
  const isDark = themeCookie === "dark";
  const colorThemeCookie = cookieStore.get("color-theme")?.value ?? "champagne";
  const langCookie = cookieStore.get("veedeck-lang")?.value as Lang | undefined;
  const initialLang: Lang | null =
    langCookie === "pl" || langCookie === "en" ? langCookie : null;

  return (
    <html
      lang={initialLang ?? "pl"}
      className={`${inter.variable} ${dmSans.variable} ${storyScript.variable} ${lato.variable} ${nunito.variable} h-full antialiased${isDark ? " dark" : ""}`}
      data-theme={colorThemeCookie}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background" suppressHydrationWarning>
        <Providers>
          <LanguageProvider initialLang={initialLang}>
            <ThemeProvider>
              {children}
              <Toaster richColors />
            </ThemeProvider>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
