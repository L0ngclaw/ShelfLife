import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { ItemsProvider } from "./src/context/ItemsContext";
import { CategoriesProvider } from "./src/context/CategoriesContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <CategoriesProvider>
            <ItemsProvider>
              <NavigationContainer>
                <RootNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </ItemsProvider>
          </CategoriesProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
