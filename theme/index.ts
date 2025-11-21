'use client'
import { createTheme } from '@mui/material/styles'
import { colors, typography as typographyTokens, borderRadius, shadows as shadowTokens } from './tokens'

/**
 * Application Theme
 *
 * Professional theme configuration inspired by modern SaaS applications
 * (Airbnb, Uber, Google Material Design 3)
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: colors.primary[400],
      main: colors.primary[500],
      dark: colors.primary[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      light: colors.secondary[400],
      main: colors.secondary[500],
      dark: colors.secondary[700],
      contrastText: '#FFFFFF',
    },
    success: {
      light: colors.success.light,
      main: colors.success.main,
      dark: colors.success.dark,
      contrastText: '#FFFFFF',
    },
    error: {
      light: colors.error.light,
      main: colors.error.main,
      dark: colors.error.dark,
      contrastText: '#FFFFFF',
    },
    warning: {
      light: colors.warning.light,
      main: colors.warning.main,
      dark: colors.warning.dark,
      contrastText: '#FFFFFF',
    },
    info: {
      light: colors.info.light,
      main: colors.info.main,
      dark: colors.info.dark,
      contrastText: '#FFFFFF',
    },
    grey: colors.grey,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    divider: colors.grey[300],
  },

  typography: {
    fontFamily: typographyTokens.fontFamily.primary,
    fontSize: 14,
    h1: {
      fontSize: typographyTokens.fontSize['4xl'],
      fontWeight: typographyTokens.fontWeight.bold,
      lineHeight: typographyTokens.lineHeight.tight,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: typographyTokens.fontSize['3xl'],
      fontWeight: typographyTokens.fontWeight.bold,
      lineHeight: typographyTokens.lineHeight.tight,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: typographyTokens.fontSize['2xl'],
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.tight,
    },
    h4: {
      fontSize: typographyTokens.fontSize.xl,
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    h5: {
      fontSize: typographyTokens.fontSize.lg,
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    h6: {
      fontSize: typographyTokens.fontSize.base,
      fontWeight: typographyTokens.fontWeight.semibold,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    body1: {
      fontSize: typographyTokens.fontSize.sm,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    body2: {
      fontSize: typographyTokens.fontSize.xs,
      lineHeight: typographyTokens.lineHeight.normal,
    },
    button: {
      fontSize: typographyTokens.fontSize.sm,
      fontWeight: typographyTokens.fontWeight.medium,
      textTransform: 'none', // Disable uppercase (more modern)
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: typographyTokens.fontSize.xs,
      lineHeight: typographyTokens.lineHeight.normal,
      color: colors.text.secondary,
    },
    overline: {
      fontSize: typographyTokens.fontSize.xs,
      fontWeight: typographyTokens.fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      lineHeight: typographyTokens.lineHeight.normal,
    },
  },

  shape: {
    borderRadius: parseFloat(borderRadius.md),
  },

  shadows: [
    'none',
    shadowTokens.sm,
    shadowTokens.md,
    shadowTokens.md,
    shadowTokens.lg,
    shadowTokens.lg,
    shadowTokens.lg,
    shadowTokens.xl,
    shadowTokens.xl,
    shadowTokens.xl,
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
    shadowTokens['2xl'],
  ],

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          padding: '10px 20px',
          fontWeight: typographyTokens.fontWeight.medium,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: shadowTokens.sm,
          },
        },
        contained: {
          '&:hover': {
            boxShadow: shadowTokens.md,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: typographyTokens.fontSize.xs,
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: typographyTokens.fontSize.base,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.grey[200]}`,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
        },
        elevation1: {
          boxShadow: shadowTokens.sm,
        },
        elevation2: {
          boxShadow: shadowTokens.md,
        },
        elevation3: {
          boxShadow: shadowTokens.lg,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: borderRadius.md,
            '& fieldset': {
              borderWidth: '1.5px',
              borderColor: colors.grey[300],
            },
            '&:hover fieldset': {
              borderColor: colors.grey[400],
            },
            '&.Mui-focused fieldset': {
              borderWidth: '2px',
              borderColor: colors.primary[500],
            },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          fontWeight: typographyTokens.fontWeight.medium,
        },
        outlined: {
          borderWidth: '1.5px',
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          fontWeight: typographyTokens.fontWeight.regular,
        },
        outlined: {
          borderWidth: '1.5px',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: borderRadius.lg,
          boxShadow: shadowTokens['2xl'],
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.grey[900],
          fontSize: typographyTokens.fontSize.xs,
          borderRadius: borderRadius.sm,
          padding: '8px 12px',
        },
      },
    },

    // MuiDataGrid: {
    //   // Note: MuiDataGrid theme customization is not supported in MUI v7 core theme
    //   // DataGrid styles should be customized via sx prop or global styles
    //   styleOverrides: {
    //     root: {
    //       borderRadius: borderRadius.lg,
    //       border: `1px solid ${colors.grey[300]}`,
    //       '& .MuiDataGrid-columnHeaders': {
    //         backgroundColor: colors.grey[50],
    //         borderBottom: `2px solid ${colors.grey[300]}`,
    //       },
    //       '& .MuiDataGrid-columnHeader': {
    //         fontWeight: typographyTokens.fontWeight.semibold,
    //         fontSize: typographyTokens.fontSize.xs,
    //         color: colors.text.primary,
    //         textTransform: 'uppercase',
    //         letterSpacing: '0.05em',
    //       },
    //       '& .MuiDataGrid-cell': {
    //         fontSize: typographyTokens.fontSize.sm,
    //       },
    //       '& .MuiDataGrid-row': {
    //         '&:hover': {
    //           backgroundColor: colors.grey[50],
    //         },
    //       },
    //     },
    //   },
    // },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: shadowTokens.sm, // Material Design elevation 1
          backgroundColor: '#FFFFFF',
          color: colors.text.primary,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colors.grey[200]}`,
          boxShadow: 'none', // Material Design elevation 0
          backgroundColor: colors.background.paper,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.md,
          marginLeft: '8px',
          marginRight: '8px',
          marginBottom: '4px',
          paddingLeft: '16px',
          paddingRight: '16px',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)', // Material motion
          '&:hover': {
            backgroundColor: colors.grey[100],
          },
          '&.Mui-selected': {
            backgroundColor: `${colors.primary[50]}`,
            color: colors.primary[700],
            fontWeight: typographyTokens.fontWeight.semibold,
            borderLeft: `3px solid ${colors.primary[500]}`, // Material Design active indicator
            paddingLeft: '13px', // Adjust for border
            '&:hover': {
              backgroundColor: `${colors.primary[100]}`,
            },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '40px', // Reduce spacing for better alignment
          color: 'inherit',
        },
      },
    },
  },
})
