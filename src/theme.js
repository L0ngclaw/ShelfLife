// One place for the app's colours, used by Paper components and navigation
import { MD3LightTheme } from "react-native-paper";
import { DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2E7D32",
    onPrimary: "#FFFFFF",
    primaryContainer: "#C8E6C9",
    onPrimaryContainer: "#0B3D0F",
    secondary: "#558B2F",
    onSecondary: "#FFFFFF",
    secondaryContainer: "#DCEDC8",
    onSecondaryContainer: "#1B3409",
    background: "#FAFBF7",
    surfaceVariant: "#E7EFE2",
  },
};

export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
  },
};
