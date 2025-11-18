/**
 * Design Tokens
 *
 * Centralized design system tokens inspired by Airbnb, Uber, and Google Material Design 3
 * This file defines the foundational design constants used throughout the application
 */

// Color Palette - Semantic and brand colors
export const colors = {
  // Primary - Blue (Google/Trust)
  primary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#1976D2', // main
    600: '#1565C0',
    700: '#0D47A1',
    800: '#0A3D91',
    900: '#062B6B',
  },

  // Secondary - Teal (Modern/Professional)
  secondary: {
    50: '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#26A69A',
    500: '#00897B', // main
    600: '#00796B',
    700: '#00695C',
    800: '#00574B',
    900: '#004D40',
  },

  // Semantic Colors
  success: {
    light: '#81C784',
    main: '#10B981',
    dark: '#059669',
  },
  error: {
    light: '#EF5350',
    main: '#EF4444',
    dark: '#DC2626',
  },
  warning: {
    light: '#FFB74D',
    main: '#F59E0B',
    dark: '#D97706',
  },
  info: {
    light: '#64B5F6',
    main: '#3B82F6',
    dark: '#2563EB',
  },

  // Neutral/Grey Scale
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Background Colors
  background: {
    default: '#FFFFFF',
    paper: '#FAFAFA',
    elevated: '#FFFFFF',
  },

  // Text Colors
  text: {
    primary: '#222222',     // Airbnb-inspired (high contrast)
    secondary: '#616161',   // Improved contrast (5.74:1) - WCAG AA compliant
    disabled: '#B0B0B0',
  },
}

// Typography Scale (based on 16px base)
export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    monospace: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },

  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },

  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

// Spacing Scale (8px base unit)
export const spacing = {
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
}

// Border Radius
export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '8px',      // Default
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
}

// Shadows (elevation system)
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
}

// Z-Index Scale
export const zIndex = {
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500,
}

// Breakpoints (same as MUI defaults)
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
}

// Transitions
export const transitions = {
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
}

// Component-specific tokens
export const components = {
  button: {
    height: {
      small: '32px',
      medium: '40px',
      large: '48px',
    },
    padding: {
      small: '8px 16px',
      medium: '10px 20px',
      large: '12px 24px',
    },
  },
  input: {
    height: {
      small: '32px',
      medium: '40px',
      large: '48px',
    },
  },
  card: {
    padding: {
      small: '12px',
      medium: '16px',
      large: '24px',
    },
  },
}
