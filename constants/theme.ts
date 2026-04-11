/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#0F172A",
    background: "#F8FAFC",
    card: "#FFFFFF",
    primary: "#0F172A",
    secondary: "#64748B",
    accent: "#3B82F6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    border: "#E2E8F0",
    input: "#F1F5F9",
    tint: "#0F172A",
    icon: "#64748B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#0F172A",
  },
  dark: {
    text: "#F8FAFC",
    background: "#0F172A",
    card: "#1E293B",
    primary: "#3B82F6",
    secondary: "#94A3B8",
    accent: "#60A5FA",
    success: "#34D399",
    warning: "#FBBF24",
    danger: "#F87171",
    border: "#334155",
    input: "#1E293B",
    tint: "#3B82F6",
    icon: "#94A3B8",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#3B82F6",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
