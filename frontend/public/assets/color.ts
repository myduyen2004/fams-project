/**
 * FPT UNIVERSITY COLOR PALETTE
 * Màu sắc chuẩn của FPT University
 */

export const FPT_COLORS = {
  // ========================================
  // MAIN BRAND COLORS
  // ========================================
  orange: '#F37021',      // FPT Orange - Màu chủ đạo
  blue: '#00529C',        // FPT Blue
  green: '#4BA840',       // FPT Green
  
  // ========================================
  // ADDITIONAL COLORS
  // ========================================
  lightGray: '#E6E6E6',   // Light gray - Borders, dividers
  cream: '#FFF7ED',       // Cream/Peach - Soft backgrounds
  
  // ========================================
  // PRIMARY SHADES (Orange)
  // ========================================
  primary: {
    DEFAULT: '#F37021',
    light: '#FF8C42',
    dark: '#D85F0A',
    50: '#FFF7ED',        // ← Cream color ở đây
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

  // ========================================
  // NEUTRAL COLORS
  // ========================================
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    lightGray: '#E6E6E6',  // ← Light gray ở đây
    50: '#FAFAFA',
    100: '#F3F4F6',
    200: '#E6E6E6',        // ← Light gray ở đây
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // ========================================
  // BACKGROUNDS
  // ========================================
  background: {
    light: '#FFFFFF',
    cream: '#FFF7ED',      // ← Cream background
    lightGray: '#E6E6E6',  // ← Light gray background
    dark: '#18181B',       // Dark mode
  },

  // ========================================
  // DARK MODE
  // ========================================
  dark: {
    bg: '#18181B',
    surface: '#27272A',
    border: '#3F3F46',
  },

  // ========================================
  // SEMANTIC COLORS
  // ========================================
  success: '#4BA840',      // FPT Green
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#00529C',         // FPT Blue
} as const;

/**
 * USAGE:
 * - Primary button: bg-[#F37021]
 * - Light gray border: border-[#E6E6E6]
 * - Cream background: bg-[#FFF7ED]
 */