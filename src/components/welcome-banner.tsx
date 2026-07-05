"use client";
import { useEffect, useState } from "react";

type Pod = "manana" | "tarde" | "noche";

function partOfDay(h: number): Pod {
  if (h >= 5 && h < 12) return "manana";
  if (h >= 12 && h < 19) return "tarde";
  return "noche";
}

const GREETING: Record<Pod, string> = {
  manana: "Buenos días",
  tarde: "Buenas tardes",
  noche: "Buenas noches",
};

function Icon({ pod, className }: { pod: Pod; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  if (pod === "manana")
    return (
      <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
    );
  if (pod === "tarde")
    return (
      <svg {...common}><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="9" x2="12" y2="2" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" /></svg>
    );
  return (
    <svg {...common}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
  );
}

export function WelcomeBanner({ name }: { name: string }) {
  const [pod, setPod] = useState<Pod | null>(null);
  useEffect(() => { setPod(partOfDay(new Date().getHours())); }, []);
  const p = pod ?? "manana";
  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-800 p-5 text-white shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-4 -top-6 text-white/5">
        <Icon pod={p} className="h-40 w-40" />
      </div>
      <div className="relative z-10 flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold-400 ring-1 ring-white/15">
          <Icon pod={p} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gold-300">
            {pod ? GREETING[p] : "Hola"},
          </p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
          <p className="mt-0.5 text-xs capitalize text-white/60">{today}</p>
        </div>
      </div>
    </section>
  );
}
