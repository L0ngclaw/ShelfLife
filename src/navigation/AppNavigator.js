import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PantryScreen from "../screens/PantryScreen";
import ImpactScreen from "../screens/ImpactScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { theme } from "../theme";

const Tab = createBottomTabNavigator();

const ICONS = {
  Pantry: "fridge-outline",
  Impact: "leaf",
  Settings: "cog-outline",
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={ICONS[route.name]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen name="Pantry" component={PantryScreen} />
      <Tab.Screen name="Impact" component={ImpactScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
