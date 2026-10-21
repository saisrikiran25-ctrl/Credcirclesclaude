import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME}: ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: "Community credit circles for students and young adults. Prototype.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f5f0",
    theme_color: "#23307a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
