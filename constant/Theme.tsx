export const COLORS = {
  background: "#FFF8EF",
  surface: "#FFFFFF",
  primary: "#F97316",
  primaryLight: "#FFEDD5",
  primaryDark: "#EA580C",
  secondary: "#22C55E",
  secondaryLight: "#DCFCE7",
  text: "#1F2933",
  textLight: "#64748B",
  muted: "#6B7280",
  border: "#F3E7D8",
  danger: "#EF4444",
  gold: "#D97706",
  goldLight: "#FEF3C7",
};

export const GRADIENTS = {
  primary: ["#F97316", "#FB923C", "#FDBA74"] as const,
  warm: ["#F97316", "#FB923C", "#FFEDD5"] as const,
  sunset: ["#EA580C", "#F97316", "#FB923C"] as const,
};

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
};

export const SHADOWS = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
  },
};