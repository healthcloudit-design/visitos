import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PRAXIS Visita", template: "%s · PRAXIS Visita" },
  description: "Gestión de visitas médicas y equipos de campo · Praxis Platform",
  applicationName: "PRAXIS Visita",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d3b48" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
