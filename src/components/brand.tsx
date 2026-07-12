export function BrandMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PRAXIS Visita">
      <rect x="7" y="7" width="50" height="50" rx="15" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M32 16c-6.1 0-11 4.9-11 11 0 6.6 6.8 15.7 9.6 19.2a1.8 1.8 0 0 0 2.8 0C36.2 42.7 43 33.6 43 27c0-6.1-4.9-11-11-11z" fill="#bea06c" />
      <circle cx="32" cy="27" r="4.6" fill="#ffffff" />
    </svg>
  );
}

export function Wordmark({
  iconClass = "h-7 w-7",
  textClass = "text-base",
  className = "",
}: { iconClass?: string; textClass?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={`${iconClass} text-brand-700`} />
      <span className={`font-bold tracking-tight text-brand-700 ${textClass}`}>
        PRAXIS <span className="text-gold-600">Visita</span>
      </span>
    </span>
  );
}
