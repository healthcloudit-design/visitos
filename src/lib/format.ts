import type { Account } from "./types";

export const SENTINEL_YEAR = 1904; // cumpleaños sin año conocido

export function fmtBirthday(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  return y && y !== SENTINEL_YEAR ? `${base}/${y}` : base;
}

/** Días hasta el próximo cumpleaños (0 = hoy). */
export function daysToBirthday(iso: string | null, from = new Date()): number | null {
  if (!iso) return null;
  const [, m, d] = iso.split("-").map(Number);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

const digits = (s: string) => s.replace(/[^\d+]/g, "");

export function telHref(a: Account): string | null {
  const p = a.phone || a.whatsapp;
  return p ? `tel:${digits(p)}` : null;
}

export function waHref(a: Account, text?: string): string | null {
  let p = a.whatsapp || a.phone;
  if (!p) return null;
  let n = digits(p).replace(/^\+/, "");
  if (!n.startsWith("54")) n = "54" + (n.length === 8 ? "11" + n : n);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function mailHref(a: Account, subject?: string, body?: string): string | null {
  if (!a.email) return null;
  const q = new URLSearchParams();
  if (subject) q.set("subject", subject);
  if (body) q.set("body", body);
  const qs = q.toString();
  return `mailto:${a.email}${qs ? "?" + qs : ""}`;
}

export function mapsHref(a: Account): string | null {
  if (a.latitude && a.longitude) return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
  if (!a.address) return null;
  const q = [a.address, a.city, a.province].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function greetingText(a: Account): string {
  const first = a.name.split(" ").slice(-1)[0]; // los nombres vienen APELLIDO NOMBRE
  const nice = first.charAt(0) + first.slice(1).toLowerCase();
  return `Hola ${nice}, queríamos saludarte por tu cumpleaños y desearte un excelente día. ¡Que lo disfrutes mucho!`;
}

export function firstNameGuess(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
}
