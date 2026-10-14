/** Глубокий зелёный значка, без градиента. */
export const VERIFIED_BADGE_GREEN = "#14663F";

const SEAL_PATH =
  "m23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69z";
const CHECK_PATH = "M10.09 16.72 6.29 12.91 7.77 11.43 10.09 13.76 15.94 7.89 17.42 9.37z";

type Props = {
  /** Сторона квадрата, px. */
  size?: number;
};

/** Печать и галочка — разные фигуры, чтобы цвет галочки не зависел от заливки печати. */
export function VerifiedBadgeIcon({ size = 24 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path className="badge-seal" fill={VERIFIED_BADGE_GREEN} d={SEAL_PATH} />
      <path className="badge-check" fill="#ffffff" d={CHECK_PATH} />
    </svg>
  );
}
