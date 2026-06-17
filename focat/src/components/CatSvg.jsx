import React from 'react'

const COLOR_MAP = {
  0: 'transparent',
  1: '#4B4B54', // Dark grey outline
  2: '#7D7D8C', // Mid grey coat
  3: '#FFFFFF', // White face / chest
  4: '#00E3E3', // Turquoise collar
  5: '#FFAEAE', // Inner ear pink
  6: '#000000', // Black eyes
}

const CAT_GRID = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0],
  [0,0,0,0,0,0,0,1,2,1,0,1,2,1,0,0],
  [0,0,0,0,0,0,0,1,5,2,1,2,5,1,0,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,1,0],
  [0,0,0,0,0,0,1,2,6,2,2,2,6,2,1,0],
  [0,0,0,0,0,0,1,2,2,2,2,2,2,2,1,0],
  [0,0,0,0,0,0,1,2,3,3,3,3,3,2,1,0],
  [0,0,0,0,0,0,0,1,2,3,3,3,2,1,0,0],
  [0,0,0,0,0,0,0,0,4,4,4,4,4,0,0,0],
  [0,0,1,1,0,0,0,1,2,2,3,3,2,1,0,0],
  [0,1,2,2,1,0,1,2,2,2,3,3,2,2,1,0],
  [1,2,2,2,2,1,1,2,2,2,3,3,2,2,1,0],
  [1,2,2,1,2,2,1,2,2,2,2,2,2,2,1,0],
  [1,2,2,1,2,2,1,2,2,2,2,2,2,2,1,0],
  [0,1,2,2,1,1,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,1,2,2,2,2,2,2,2,2,1,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0]
]

export default function CatSvg({ mode = 'idle', size = 80 }) {
  // Let's render the high-fidelity pixel cat from the grid
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 18"
      style={{ imageRendering: 'pixelated', overflow: 'visible' }}
    >
      {CAT_GRID.map((row, rIdx) =>
        row.map((val, cIdx) => {
          if (val === 0) return null
          return (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx}
              y={rIdx}
              width="1"
              height="1"
              fill={COLOR_MAP[val]}
            />
          )
        })
      )}
    </svg>
  )
}
