import React from 'react'

interface SkeletonBlockProps {
  height?: number
}

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ height = 120 }) => {
  return (
    <div
      style={{
        height,
        background: 'linear-gradient(90deg, #1a1a1a 25%, #222 37%, #1a1a1a 63%)',
        backgroundSize: '400% 100%',
        animation: 'mra-skeleton 1.4s ease infinite',
        border: '1px solid #333',
        borderRadius: 4,
      }}
    />
  )
}

export default SkeletonBlock
