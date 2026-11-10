// The board follows its CSS-allocated width, never the space left by messages.
// Short-landscape CSS allocates a stable viewport-bounded column first.
export function boardSize(width){return Math.max(1,Math.floor(width))}
