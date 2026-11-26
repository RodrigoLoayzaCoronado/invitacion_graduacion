import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const Birrete = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4 2 9l10 5 10-5-10-5Z" fill="currentColor" stroke="none" />
    <path d="M6 11.2v4.3c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-4.3" />
    <path d="M22 9v5" />
    <circle cx="22" cy="15" r="0.9" fill="currentColor" />
  </svg>
);

export const Iglesia = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2v4M10 4h4" />
    <path d="M7 21V11l5-4 5 4v10" />
    <path d="M3 21v-6l4-2.5M21 21v-6l-4-2.5" />
    <path d="M10.5 21v-3.5a1.5 1.5 0 0 1 3 0V21" />
    <path d="M2 21h20" />
  </svg>
);

export const Copa = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3h5l-.5 6a2 2 0 0 1-4 0L6 3Z" />
    <path d="M8.5 11v8M6.5 19h4" />
    <path d="M13 3h5l.5 6a2 2 0 0 1-4 0L13 3Z" transform="rotate(8 15.5 9)" />
    <path d="M15.8 11.4l-1 7.9M12.8 19h4" />
  </svg>
);

export const Musica = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);

export const Camara = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.4-2h7.6l1.4 2h2.3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const Calendario = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const Reloj = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const Pin = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-7.2 7-12.2A7 7 0 0 0 5 8.8C5 13.8 12 21 12 21Z" />
    <circle cx="12" cy="8.8" r="2.4" />
  </svg>
);

export const Corbata = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 3h4l-1 3h-2l-1-3Z" />
    <path d="M11 6l-2 10 3 4 3-4-2-10" />
  </svg>
);

export const Whatsapp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z" />
  </svg>
);

export const Esquina = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path d="M4 44C4 24 24 4 44 4" fill="none" style={{ stroke: 'var(--rojo)' }} strokeWidth="1" opacity="0.55" />
    <circle cx="4" cy="44" r="2" style={{ fill: 'var(--rojo)' }} opacity="0.6" />
    <path d="M4 34c6 0 10-4 10-10" fill="none" stroke="#9a9a9a" strokeWidth="1" opacity="0.6" />
  </svg>
);
