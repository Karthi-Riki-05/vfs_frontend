// ValueChart Design System — Green Theme
// Based on the design system specification

export const colors = {
  // Primary
  primary: '#3CB371',         // Medium Sea Green — buttons, active states, links, badges
  primaryDark: '#2E8B57',     // Sea Green — hover states
  primaryLight: '#F0FFF4',    // Very light green — selected backgrounds

  // Backgrounds
  background: '#FFFFFF',      // Main content area
  sidebarBg: '#FFFFFF',       // Sidebar background
  cardBg: '#F8F9FA',          // Card hover background
  inputBg: '#F8F9FA',         // Search input background

  // Text
  text: '#1A1A2E',            // Headings, body text
  textSecondary: '#8C8C8C',   // Timestamps, subtitles, labels
  textMuted: '#BFBFBF',       // Placeholders

  // Borders
  border: '#F0F0F0',          // Card borders, dividers

  // Accent Colors
  starYellow: '#FAAD14',      // Favorite star icon
  deleteRed: '#FF4D4F',       // Delete actions, logout text
  badgeBlue: '#1890FF',       // Unread count badge
  onlineGreen: '#52C41A',     // Online status dot

  // Legacy compatibility
  success: '#3CB371',
  warning: '#FAAD14',
  danger: '#FF4D4F',
  info: '#1890FF',
  surface: '#FFFFFF',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

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
      itemBg: 'transparent',
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
