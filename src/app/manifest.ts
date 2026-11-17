import type { MetadataRoute } from "next";

/** Lets "Add to Home Screen" install Za5 with its own icon, opening full-screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Za5: Home Chores",
    short_name: "Za5",
    description: "Chores, routines and supplies for your home, on your own floor plan.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#eef3ff",
    theme_color: "#eef3ff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
