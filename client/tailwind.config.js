/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0B3C5D',
          navyDark: '#07243A',
          navyLight: '#164E72',
          navyMuted: '#EBF2F7',
          saffron: '#D97706',
          saffronHover: '#B45309',
          saffronLight: '#FFFBEB',
          saffronBorder: '#FDE68A',
          bg: '#F4F6F8',
          card: '#FFFFFF',
          border: '#D9DEE4',
          borderLight: '#EDF1F5',
          text: '#1E293B',
          textMuted: '#475569',
          textLight: '#64748B',
        },
        status: {
          pending: '#92400E',
          pendingBg: '#FEF3C7',
          pendingBorder: '#FCD34D',
          process: '#1E40AF',
          processBg: '#DBEAFE',
          processBorder: '#93C5FD',
          overdue: '#991B1B',
          overdueBg: '#FEE2E2',
          overdueBorder: '#FCA5A5',
          disposed: '#166534',
          disposedBg: '#DCFCE7',
          disposedBorder: '#86EFAC',
          transferred: '#334155',
          transferredBg: '#F1F5F9',
          transferredBorder: '#CBD5E1',
          escalated: '#7F1D1D',
          escalatedBg: '#FFE4E6',
          escalatedBorder: '#FDA4AF',
        }
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '3px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
      boxShadow: {
        none: 'none',
        card: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        modal: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif'],
        mono: ['Consolas', '"Courier New"', 'monospace']
      },
      fontSize: {
        xxs: '0.6875rem', // 11px
        xs: '0.75rem',    // 12px
        sm: '0.8125rem',  // 13px
        base: '0.875rem', // 14px base
        md: '0.9375rem',  // 15px
        lg: '1.0625rem',  // 17px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
      }
    },
  },
  plugins: [],
}
