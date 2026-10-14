import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Public_Sans, Yellowtail } from "next/font/google";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow" });
const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-public-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });
const yellowtail = Yellowtail({ subsets: ["latin"], weight: "400", variable: "--font-yellowtail" });

export const metadata: Metadata = {
  title: "Registre des véhicules — SAHP",
  description: "Registre public des véhicules de la San Andreas Highway Patrol.",
  icons: { icon: "/logo-sahp.webp" },
};

// Applique le thème avant le premier rendu : choix enregistré, sinon préférence système.
const themeScript = `try{var t=localStorage.getItem('sahp-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${barlow.variable} ${publicSans.variable} ${plexMono.variable} ${yellowtail.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <Header />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
