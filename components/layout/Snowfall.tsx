import type { CSSProperties } from "react";

type Snowflake = {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  opacity: number;
};

const snowflakes: Snowflake[] = [
  { left: 2, size: 82, delay: -2, duration: 24, drift: 42, spin: 90, opacity: 0.28 },
  { left: 8, size: 38, delay: -15, duration: 18, drift: -28, spin: -120, opacity: 0.38 },
  { left: 14, size: 58, delay: -8, duration: 26, drift: 36, spin: 180, opacity: 0.22 },
  { left: 20, size: 34, delay: -4, duration: 17, drift: -22, spin: -90, opacity: 0.34 },
  { left: 27, size: 92, delay: -19, duration: 31, drift: 52, spin: 140, opacity: 0.2 },
  { left: 34, size: 46, delay: -11, duration: 21, drift: -40, spin: -160, opacity: 0.32 },
  { left: 40, size: 70, delay: -6, duration: 29, drift: 30, spin: 110, opacity: 0.24 },
  { left: 48, size: 42, delay: -23, duration: 19, drift: -24, spin: -130, opacity: 0.36 },
  { left: 55, size: 102, delay: -13, duration: 34, drift: 46, spin: 190, opacity: 0.18 },
  { left: 62, size: 54, delay: -5, duration: 23, drift: -34, spin: -100, opacity: 0.3 },
  { left: 69, size: 78, delay: -27, duration: 30, drift: 38, spin: 170, opacity: 0.23 },
  { left: 76, size: 36, delay: -9, duration: 18, drift: -20, spin: -80, opacity: 0.4 },
  { left: 84, size: 88, delay: -17, duration: 32, drift: 44, spin: 150, opacity: 0.21 },
  { left: 92, size: 52, delay: -7, duration: 22, drift: -36, spin: -140, opacity: 0.31 },
  { left: 97, size: 74, delay: -26, duration: 28, drift: -48, spin: 120, opacity: 0.24 },
  { left: 5, size: 44, delay: -31, duration: 20, drift: 24, spin: -110, opacity: 0.35 },
  { left: 17, size: 108, delay: -35, duration: 36, drift: -54, spin: 210, opacity: 0.16 },
  { left: 31, size: 62, delay: -29, duration: 25, drift: 32, spin: -170, opacity: 0.27 },
  { left: 44, size: 30, delay: -14, duration: 16, drift: -18, spin: 95, opacity: 0.42 },
  { left: 59, size: 84, delay: -33, duration: 33, drift: 50, spin: -200, opacity: 0.19 },
  { left: 72, size: 48, delay: -21, duration: 21, drift: -26, spin: 125, opacity: 0.33 },
  { left: 87, size: 64, delay: -37, duration: 27, drift: 34, spin: -150, opacity: 0.25 },
];

const snowfallCss = `
  .snowfall {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .snowflake {
    position: absolute;
    top: calc(var(--snow-size) * -1.6);
    left: var(--snow-left);
    width: calc(var(--snow-size) * 1.24);
    height: calc(var(--snow-size) * 1.24);
    opacity: 0;
    transform: translate3d(0, 0, 0);
    animation: polar-snowflake-fall var(--snow-duration) linear infinite;
    animation-delay: var(--snow-delay);
    color: rgba(245, 252, 255, var(--snow-opacity));
    filter:
      drop-shadow(0 0 8px rgba(255, 255, 255, 0.28))
      drop-shadow(0 0 18px rgba(125, 211, 252, 0.42));
    will-change: transform, opacity;
  }

  .snowflake svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  @keyframes polar-snowflake-fall {
    0% {
      opacity: 0;
      transform: translate3d(0, -10vh, 0) rotate(0deg);
    }
    10% {
      opacity: var(--snow-opacity);
    }
    88% {
      opacity: var(--snow-opacity);
    }
    100% {
      opacity: 0;
      transform: translate3d(var(--snow-drift), 118vh, 0)
        rotate(var(--snow-spin));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .snowflake {
      animation: none;
      opacity: calc(var(--snow-opacity) * 0.62);
      transform: translate3d(0, 18vh, 0) rotate(18deg);
    }
  }
`;

function SnowflakeSvg() {
  return (
    <svg viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g transform="translate(340,340)">
        <g
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {[0, 60, 120, 180, 240, 300].map((rotation) => (
            <g key={rotation} transform={`rotate(${rotation})`}>
              <line x1="0" y1="0" x2="0" y2="-240" />
              <line x1="0" y1="-95" x2="-46" y2="-141" />
              <line x1="0" y1="-95" x2="46" y2="-141" />
              <line x1="0" y1="-175" x2="-38" y2="-213" />
              <line x1="0" y1="-175" x2="38" y2="-213" />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}

export function Snowfall() {
  return (
    <>
      <style>{snowfallCss}</style>
      <div className="snowfall" aria-hidden="true">
        {snowflakes.map((flake, index) => (
          <span
            key={`${flake.left}-${index}`}
            className="snowflake"
            style={
              {
                "--snow-left": `${flake.left}%`,
                "--snow-size": `${flake.size}px`,
                "--snow-delay": `${flake.delay}s`,
                "--snow-duration": `${flake.duration}s`,
                "--snow-drift": `${flake.drift}px`,
                "--snow-spin": `${flake.spin}deg`,
                "--snow-opacity": Math.min(flake.opacity + 0.28, 0.72),
              } as CSSProperties
            }
          >
            <SnowflakeSvg />
          </span>
        ))}
      </div>
    </>
  );
}
