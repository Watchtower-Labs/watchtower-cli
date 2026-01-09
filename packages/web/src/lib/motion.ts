/**
 * Cinematic Motion System
 *
 * Motion tokens and Framer Motion variants for the editorial design system.
 * All animations are smooth, cinematic, and purposeful.
 */

// Duration tokens (in seconds for Framer Motion)
export const duration = {
  micro: 0.15,
  standard: 0.3,
  emphasis: 0.5,
  cinematic: 0.8,
  slow: 1.2,
} as const

// Easing curves
export const easing = {
  // Standard smooth easing
  smooth: [0.4, 0, 0.2, 1],
  // Dramatic entrance (fast start, gentle end)
  dramatic: [0.16, 1, 0.3, 1],
  // Elegant, refined motion
  elegant: [0.22, 1, 0.36, 1],
  // Bouncy exit (for dismissals)
  exit: [0.4, 0, 1, 1],
} as const

// ===========================================
// FRAMER MOTION VARIANTS
// ===========================================

/**
 * Fade in with subtle upward motion
 * Use for: general content, cards, sections
 */
export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.emphasis, ease: easing.elegant }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

/**
 * Dramatic slide up entrance
 * Use for: hero content, headlines, important elements
 */
export const slideUp = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.cinematic, ease: easing.dramatic }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

/**
 * Scale in from slightly smaller
 * Use for: modals, cards, focus states
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.standard, ease: easing.elegant }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.micro, ease: easing.exit }
  },
}

/**
 * Fade in only (no movement)
 * Use for: overlays, backgrounds, subtle reveals
 */
export const fadeOnly = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.emphasis, ease: easing.smooth }
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

/**
 * Slide in from left
 * Use for: sidebars, panels, navigation
 */
export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.emphasis, ease: easing.elegant }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

/**
 * Slide in from right
 * Use for: detail panels, tooltips
 */
export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.emphasis, ease: easing.elegant }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

// ===========================================
// STAGGER CONTAINERS
// ===========================================

/**
 * Stagger children with short delay
 * Use for: lists, grids, navigation items
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

/**
 * Stagger children with longer delay (more dramatic)
 * Use for: hero content, feature lists
 */
export const staggerContainerSlow = {
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

/**
 * Stagger children quickly
 * Use for: menu items, tabs
 */
export const staggerContainerFast = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

// ===========================================
// CHILD VARIANTS (for use with stagger)
// ===========================================

export const staggerChild = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.emphasis, ease: easing.elegant }
  },
}

export const staggerChildScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.standard, ease: easing.elegant }
  },
}

// ===========================================
// HOVER & TAP VARIANTS
// ===========================================

/**
 * Subtle scale on hover
 * Use for: buttons, cards, interactive elements
 */
export const hoverScale = {
  scale: 1.02,
  transition: { duration: duration.micro, ease: easing.smooth },
}

export const tapScale = {
  scale: 0.98,
  transition: { duration: duration.micro, ease: easing.smooth },
}

/**
 * Glow effect on hover (via boxShadow)
 */
export const hoverGlow = {
  boxShadow: '0 0 40px rgba(255, 255, 255, 0.1)',
  transition: { duration: duration.standard, ease: easing.smooth },
}

// ===========================================
// PAGE TRANSITIONS
// ===========================================

export const pageTransition = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.emphasis, ease: easing.smooth }
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.standard, ease: easing.exit }
  },
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Create a delayed variant
 */
export function withDelay<T extends object>(variant: T, delay: number): T {
  return {
    ...variant,
    animate: {
      ...(variant as any).animate,
      transition: {
        ...(variant as any).animate?.transition,
        delay,
      },
    },
  }
}

/**
 * Create a custom duration variant
 */
export function withDuration<T extends object>(variant: T, newDuration: number): T {
  return {
    ...variant,
    animate: {
      ...(variant as any).animate,
      transition: {
        ...(variant as any).animate?.transition,
        duration: newDuration,
      },
    },
  }
}
