/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark palette
        background: '#000000',
        foreground: '#FFFFFF',
        surface: '#0A0A0A',

        // Deep blacks with subtle variation
        black: {
          DEFAULT: '#000000',
          rich: '#050505',
          soft: '#0A0A0A',
          elevated: '#141414',
          border: '#1A1A1A',
        },

        // Warm grays for text hierarchy
        gray: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },

        // Accent colors - soft, elegant
        success: {
          DEFAULT: '#4ADE80',
          soft: '#22C55E',
          muted: 'rgba(74, 222, 128, 0.15)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          soft: '#F59E0B',
          muted: 'rgba(251, 191, 36, 0.15)',
        },
        error: {
          DEFAULT: '#F87171',
          soft: '#EF4444',
          muted: 'rgba(248, 113, 113, 0.15)',
        },
        info: {
          DEFAULT: '#60A5FA',
          soft: '#3B82F6',
          muted: 'rgba(96, 165, 250, 0.15)',
        },

        // Glass effect colors
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          light: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.1)',
          hover: 'rgba(255, 255, 255, 0.12)',
        },

        // Code/terminal colors
        code: {
          bg: '#0D0D0D',
          surface: '#141414',
          border: '#262626',
          text: '#E4E4E7',
          comment: '#71717A',
          keyword: '#C084FC',
          string: '#4ADE80',
          number: '#FBBF24',
          function: '#60A5FA',
        },
      },

      fontFamily: {
        serif: ['var(--font-serif)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },

      fontSize: {
        // Editorial typography scale
        'display': ['5rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '500' }],
        'display-sm': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline-sm': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '500' }],
        'title': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'subtitle': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },

      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },

      boxShadow: {
        'glow-sm': '0 0 20px rgba(255, 255, 255, 0.05)',
        'glow': '0 0 40px rgba(255, 255, 255, 0.08)',
        'glow-lg': '0 0 60px rgba(255, 255, 255, 0.1)',
        'glow-success': '0 0 40px rgba(74, 222, 128, 0.15)',
        'glow-error': '0 0 40px rgba(248, 113, 113, 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },

      backgroundImage: {
        // Gradient meshes for dramatic backgrounds
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 40% 20%, rgba(120, 119, 198, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 255, 255, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(120, 119, 198, 0.1) 0px, transparent 50%)',
        'gradient-spotlight': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.15), transparent)',
        'gradient-fade': 'linear-gradient(to bottom, transparent, var(--tw-gradient-to))',
      },

      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.05)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 255, 255, 0.1)' },
        },
      },

      transitionDuration: {
        'micro': '150ms',
        'standard': '300ms',
        'emphasis': '500ms',
        'cinematic': '800ms',
      },

      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'dramatic': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'elegant': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
