import * as React from "react"

interface VisuallyHiddenProps {
  children: React.ReactNode
}

/**
 * VisuallyHidden component
 * Hides content visually but keeps it accessible to screen readers
 * Used for accessibility compliance with Radix UI Dialog components
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => {
  return (
    <span
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  )
}
