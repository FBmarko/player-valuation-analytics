export default function TeamJersey({
  primaryColor,
  secondaryColor,
  className = "h-24 w-24",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Team jersey"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="jersey-sheen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M39 16 24 23 8 49l18 11 9-14v53h50V46l9 14 18-11-16-26-15-7c-4 10-12 15-21 15s-17-5-21-15Z"
        fill={primaryColor}
      />
      <path
        d="M48 19c3 5 7 8 12 8s9-3 12-8l9-3c-4 11-12 19-21 19S43 27 39 16l9 3Z"
        fill={secondaryColor}
        opacity="0.92"
      />
      <path d="M53 36h14v63H53V36Z" fill={secondaryColor} opacity="0.88" />
      <path
        d="M8 49 24 23l12 6-13 28L8 49Zm76-20 12-6 16 26-15 8-13-28Z"
        fill={secondaryColor}
        opacity="0.78"
      />
      <path
        d="M39 16 24 23 8 49l18 11 9-14v53h50V46l9 14 18-11-16-26-15-7c-4 10-12 15-21 15s-17-5-21-15Z"
        fill="url(#jersey-sheen)"
      />
      <path
        d="M35 99h50"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
