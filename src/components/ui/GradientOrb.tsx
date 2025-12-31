'use client'

interface GradientOrbProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  animated?: boolean
  delay?: number
}

export function GradientOrb({
  className = '',
  size = 'md',
  position = 'center',
  animated = true,
  delay = 0,
}: GradientOrbProps) {
  const sizes = {
    sm: 'w-[200px] h-[200px]',
    md: 'w-[400px] h-[400px]',
    lg: 'w-[600px] h-[600px]',
    xl: 'w-[800px] h-[800px]',
  }

  const positions = {
    'top-left': '-top-1/4 -left-1/4',
    'top-right': '-top-1/4 -right-1/4',
    'bottom-left': '-bottom-1/4 -left-1/4',
    'bottom-right': '-bottom-1/4 -right-1/4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }

  const animationClass = animated ? 'animate-float' : ''
  const animationStyle = delay > 0 ? { animationDelay: `${delay}s` } : {}

  return (
    <div
      className={`
        absolute rounded-full
        bg-gradient-to-br from-primary via-primary/80 to-accent
        blur-[100px] opacity-50
        pointer-events-none
        ${sizes[size]}
        ${positions[position]}
        ${animationClass}
        ${className}
      `}
      style={animationStyle}
      aria-hidden="true"
    />
  )
}
