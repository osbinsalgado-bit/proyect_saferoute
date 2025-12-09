import { lightColors, darkColors } from "./colors";

export const getThemeColors = (theme: "light" | "dark") =>
  theme === "light" ? lightColors : darkColors;