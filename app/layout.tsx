import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { ToastProvider } from "@/components/client/toast";
import { PwaRegister } from "@/components/client/pwa-register";

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: "Form a trusted credit circle, pool small contributions, lend to each other, and keep every rupee visible. A prototype.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#23307a" }, { media: "(prefers-color-scheme: dark)", color: "#0c1020" }],
};

// Applies a saved theme choice before first paint (no flash of the wrong theme).
const themeInit = `try{var t=localStorage.getItem("circlo-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-onaccent">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
