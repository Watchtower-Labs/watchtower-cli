'use client'

import { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { scaleIn, hoverGlow } from '@/lib/motion'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  children: React.ReactNode
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hover = true, glow = false, padding = 'md', className = '', ...props }, ref) => {
    const baseStyles = 'glass rounded-2xl'
    const hoverStyles = hover ? 'transition-all duration-standard ease-elegant hover:bg-glass-hover hover:border-white/15' : ''
    const glowStyles = glow ? 'shadow-glow' : ''

    return (
      <motion.div
        ref={ref}
        className={`${baseStyles} ${paddingStyles[padding]} ${hoverStyles} ${glowStyles} ${className}`}
        variants={scaleIn}
        initial="initial"
        animate="animate"
        whileHover={hover ? { ...hoverGlow, scale: 1.01 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

// Glass card with prominent styling
export const GlassCard = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', ...props }, ref) => (
    <Card
      ref={ref}
      className={`shadow-inner-glow ${className}`}
      {...props}
    >
      {children}
    </Card>
  )
)

GlassCard.displayName = 'GlassCard'
