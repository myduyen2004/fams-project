/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // FPT Brand Colors
        'fpt-orange': '#F37021',
        'fpt-blue': '#00529C',
        'fpt-green': '#4BA840',
        
        // Primary (Orange scale)
        primary: {
          DEFAULT: '#F37021',
          light: '#FF8C42',
          dark: '#D85F0A',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F37021',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        
        // Semantic colors
        success: '#4BA840',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#00529C',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}