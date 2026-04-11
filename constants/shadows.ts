import { Platform } from "react-native";

export const getShadow = (
  color: string,
  opacity: number,
  radius: number,
  offset: { width: number; height: number },
  elevation: number,
) => {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: offset,
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    web: {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(${hexToRgb(color)}, ${opacity})`,
    },
  });
};

function hexToRgb(hex: string) {
  // Simple hex to rgb converter
  let r = 0,
    g = 0,
    b = 0;
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  return `${r}, ${g}, ${b}`;
}
