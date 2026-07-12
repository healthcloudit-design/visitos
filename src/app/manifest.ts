import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRAXIS Visita",
    short_name: "PRAXIS Visita",
    description: "Gestión de visitas médicas y equipos de campo · Praxis Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0d3b48",
    theme_color: "#0d3b48",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
