import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { CategoriesProvider } from "./src/context/CategoriesContext";
import { ItemsProvider } from "./src/context/ItemsContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { theme, navigationTheme } from "./src/theme";
import { FeedbackProvider } from "./src/context/FeedbackContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <FeedbackProvider>
          <AuthProvider>
            <CategoriesProvider>
              <ItemsProvider>
                <NavigationContainer theme={navigationTheme}>
                  <RootNavigator />
                  <StatusBar style="dark" />
                </NavigationContainer>
              </ItemsProvider>
            </CategoriesProvider>
          </AuthProvider>
        </FeedbackProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
