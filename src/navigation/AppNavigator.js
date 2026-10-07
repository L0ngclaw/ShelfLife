import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PantryScreen from "../screens/PantryScreen";
import ImpactScreen from "../screens/ImpactScreen";
import SettingsScreen from "../screens/SettingsScreen";

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
        tabBarActiveTintColor: "#2E7D32",
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
