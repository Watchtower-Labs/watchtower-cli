'use client'

import { forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import Link from 'next/link'
import { hoverScale, tapScale } from '@/lib/motion'

type ButtonVariant = 'solid' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  solid: 'bg-white text-black hover:bg-gray-100',
  ghost: 'bg-transparent text-white border border-white/20 hover:bg-white/5 hover:border-white/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-8 py-4 text-base',
  lg: 'px-10 py-5 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', size = 'md', href, children, className = '', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors duration-standard ease-elegant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black'

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

    // If href is provided, render as a link
    if (href) {
      const isExternal = href.startsWith('http') || href.startsWith('//')

      if (isExternal) {
        return (
          <motion.a
            href={href}
            className={combinedClassName}
            whileHover={hoverScale}
            whileTap={tapScale}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </motion.a>
        )
      }

      // Internal link - use Next.js Link
      return (
        <Link href={href} passHref legacyBehavior>
          <motion.a
            className={combinedClassName}
            whileHover={hoverScale}
            whileTap={tapScale}
          >
            {children}
          </motion.a>
        </Link>
      )
    }

    return (
      <motion.button
        ref={ref}
        className={combinedClassName}
        whileHover={hoverScale}
        whileTap={tapScale}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

// Convenience exports for common button types
export const SolidButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="solid" {...props} />
)
SolidButton.displayName = 'SolidButton'

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
)
GhostButton.displayName = 'GhostButton'
