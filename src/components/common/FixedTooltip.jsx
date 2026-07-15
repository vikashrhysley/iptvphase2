import { useState } from 'react';

/**
 * Hover tooltip rendered with position:fixed so it escapes any parent's
 * overflow clipping (e.g. horizontally-scrolling tables). Shows `label`
 * directly below the wrapped element, left-aligned to it.
 *
 * The wrapper is inline-flex + width:max-content so it hugs its children
 * tightly — the tooltip anchors to the actual text, not the whole cell.
 */
export default function FixedTooltip({ label, children }) {
  const [rect, setRect] = useState(null);
  if (!label) return <>{children}</>;

  // Clamp horizontally so a long ID near the right edge stays on-screen.
  const left = rect ? Math.min(rect.left, window.innerWidth - 340) : 0;

  return (
    <span
      style={{ display: 'inline-flex', maxWidth: '100%', verticalAlign: 'middle' }}
      onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      {children}
      {rect && (
        <span style={{
          position: 'fixed',
          left: Math.max(8, left),
          top: rect.bottom + 6,   // open below, aligned to the column
          background: 'var(--bg-raised, #1e293b)',
          color: 'var(--text-primary, #e2e8f0)',
          border: '1px solid var(--border-medium, rgba(255,255,255,0.16))',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {label}
        </span>
      )}
    </span>
  );
}
