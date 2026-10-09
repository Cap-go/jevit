export function LogoMark({ size = 64 }: { size?: number }) {
  return <img src="/logo.svg" width={size} height={size} alt="Jevit" className="logo-mark" draggable={false} />
}

export function Gavel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden>
      <g transform="rotate(-35 100 100)">
        <rect x="92" y="70" width="18" height="120" rx="9" fill="#F5D6FF" />
        <rect x="40" y="30" width="122" height="56" rx="16" fill="#fff" />
        <rect x="58" y="30" width="12" height="56" fill="#B026FF" />
        <rect x="132" y="30" width="12" height="56" fill="#B026FF" />
      </g>
    </svg>
  )
}
