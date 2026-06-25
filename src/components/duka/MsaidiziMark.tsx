/**
 * The Msaidizi (AI Assistant) mark — used consistently across the bottom
 * nav tab, the dashboard FAB, and the chat page's avatar bubble, so the
 * assistant has one recognizable identity instead of a generic sparkle
 * icon reused from lucide everywhere.
 *
 * Shape: a speech-bubble silhouette with a small spark/star sitting
 * inside it — reads as "a chat with intelligence in it" rather than a
 * plain AI-sparkle, and stays legible down to 16px in the nav bar.
 */
export function MsaidiziMark({ size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H9.8L6 19.5V16H6.5C5.12 16 4 14.88 4 13.5v-8Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M13.2 6.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Filled variant for use on dark/gradient backgrounds (the FAB, the chat
 * avatar) where a solid mark reads better than an outlined one.
 */
export function MsaidiziMarkFilled({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H9.8L6 19.5V16H6.5C5.12 16 4 14.88 4 13.5v-8Z"
        fill="currentColor"
        fillOpacity={0.22}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d="M13.2 6.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
