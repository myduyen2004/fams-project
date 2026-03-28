/**
 * FPT UNIVERSITY COLOR PALETTE
 * Centralized color system for the entire application
 */

export const COLORS = {
    // ========================================
    // MAIN BRAND COLORS
    // ========================================
    orange: '#F37021',      // FPT Orange - Primary brand color
    blue: '#00529C',        // FPT Blue
    green: '#4BA840',       // FPT Green

    // ========================================
    // PRIMARY SHADES (Orange)
    // ========================================
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

    // ========================================
    // NEUTRAL COLORS
    // ========================================
    neutral: {
        white: '#FFFFFF',
        black: '#000000',
        50: '#FAFAFA',
        100: '#F3F4F6',
        200: '#E6E6E6',        // Light gray
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
        cream: '#FFF7ED',      // Soft background
        gray: '#E6E6E6',       // Light gray background
        dark: '#18181B',       // Dark mode background
        darkSurface: '#27272A', // Dark mode surface
    },

    // ========================================
    // TEXT COLORS
    // ========================================
    text: {
        primary: '#111827',    // Main text (light mode)
        secondary: '#6B7280',  // Secondary text
        disabled: '#9CA3AF',   // Disabled text
        light: '#FFFFFF',      // Text on dark backgrounds
        dark: '#111827',       // Text on light backgrounds
    },

    // ========================================
    // BORDERS
    // ========================================
    border: {
        light: '#E6E6E6',
        dark: '#3F3F46',
        focus: '#F37021',      // FPT Orange for focus states
    },

    // ========================================
    // SEMANTIC COLORS
    // ========================================
    success: '#4BA840',      // FPT Green
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#00529C',         // FPT Blue
} as const;

// ========================================
// DARK MODE COLORS
// ========================================
export const DARK_MODE = {
    background: COLORS.background.dark,
    surface: COLORS.background.darkSurface,
    border: COLORS.border.dark,
    text: COLORS.text.light,
} as const;

// Export for easy import
export default COLORS;
