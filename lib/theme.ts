// ValueChart Design System — Green Theme
// Based on the design system specification

// Brand color tokens — canonical green. Use these instead of hardcoded hex.
export const BRAND_GREEN = "#34A881";
export const BRAND_GREEN_HOVER = "#1F7D5E";
export const BRAND_GREEN_LIGHT = "#E7F6F0";

export const colors = {
  // Primary
  primary: "#34A881", // Brand green — buttons, active states, links, badges
  primaryDark: "#1F7D5E", // Hover states
  primaryLight: "#E7F6F0", // Selected backgrounds
  primaryDeep: "#1F7D5E", // Links, accents, forgot password
  primaryTint: "#E7F6F0", // Very light green — selected bg

  // Backgrounds
  background: "#F5F7F6", // Main content area
  sidebarBg: "#FFFFFF", // Sidebar background
  cardBg: "#FFFFFF", // Card background (pure white)
  inputBg: "#FFFFFF", // Input background

  // Text
  text: "#1F2937", // Headings, body text
  textSecondary: "#6B7280", // Timestamps, subtitles, labels
  textMuted: "#BFBFBF", // Placeholders
  muted: "#F1F4F3", // Muted surface
  mutedFg: "#6B7280", // Muted foreground text

  // Borders
  border: "#E5EBE8", // Card borders, dividers

  // Accent Colors
  orange: "#FF9A30", // Pro badge, highlights
  starYellow: "#FAAD14", // Favorite star icon
  deleteRed: "#F85729", // Delete actions (coral)
  badgeBlue: "#006AA8", // Unread count badge
  onlineGreen: "#52C41A", // Online status dot

  // Legacy compatibility
  success: "#34A881",
  warning: "#FAAD14",
  danger: "#F85729",
  info: "#006AA8",
  surface: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 9999,
};

export const shadows = {
  card: "0 1px 2px rgba(16,40,32,0.04), 0 8px 24px -8px rgba(16,40,32,0.08)",
  fab: "0 10px 24px -6px rgba(31,125,94,0.45)",
};

export const fontFamily =
  "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Ant Design ConfigProvider theme override
export const antdTheme = {
  token: {
    colorPrimary: colors.primary,
    colorSuccess: colors.onlineGreen,
    colorWarning: colors.starYellow,
    colorError: colors.deleteRed,
    colorInfo: colors.badgeBlue,
    colorTextBase: colors.text,
    colorBgLayout: colors.background,
    colorBgContainer: colors.background,
    colorBorder: colors.border,
    colorTextSecondary: colors.textSecondary,
    borderRadius: borderRadius.md,
    fontFamily,
    fontSize: 14,
    controlHeight: 36,
  },
  components: {
    Button: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryDark,
      algorithm: true,
      borderRadius: borderRadius.md,
    },
    Card: {
      borderRadiusLG: borderRadius.lg,
      paddingLG: 0,
    },
    Menu: {
      itemBg: "transparent",
      itemSelectedBg: colors.primaryLight,
      itemSelectedColor: colors.primary,
      itemHoverBg: colors.cardBg,
      itemBorderRadius: borderRadius.md,
    },
    Input: {
      borderRadius: borderRadius.md,
    },
    Table: {
      borderRadius: borderRadius.lg,
    },
  },
};
