/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#050505',
          active: '#B82C0B',
          hover: '#141414',
          border: '#1F1F1F',
          text: '#A3A3A3',
          'text-active': '#FFFFFF',
        },
        app: {
          bg: '#FAF9F6',
          card: '#FFFFFF',
          border: '#EAE8E1',
          'border-subtle': '#F2F0EB',
        },
        text: {
          main: '#1A1A1A',
          secondary: '#737373',
          muted: '#A3A3A3',
        },
        primary: {
          DEFAULT: '#EE4416',
          dark: '#AC2808',
          hover: '#DC3A0F',
          soft: '#FDE8E1',
          active: '#B82C0B',
        },
        accent: {
          dark: '#AC2808',
          soft: '#FDE8E1',
          active: '#B82C0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 10px -2px rgba(0, 0, 0, 0.04), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'elevation': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
};
