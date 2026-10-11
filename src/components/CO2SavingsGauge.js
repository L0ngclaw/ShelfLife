// Custom component: a half-circle gauge showing CO2 saved towards a monthly goal.
//
// Props:
//   savedKg        CO2 saved this month (required)
//   wastedKg       CO2 wasted this month (default 0)
//   monthlyGoalKg  target to fill the gauge (required)
//   size           width in px (default 240)
//   strokeWidth    arc thickness (default 18)
// Events:
//   onGoalReached  fired once when savedKg reaches the goal
//   onPress        gauge tapped
import { useEffect, useEffectEvent } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function CO2SavingsGauge({
  savedKg,
  wastedKg = 0,
  monthlyGoalKg,
  size = 240,
  strokeWidth = 18,
  onGoalReached,
  onPress,
}) {
  const progress = monthlyGoalKg > 0 ? Math.min(1, savedKg / monthlyGoalKg) : 0;
  const goalReached = progress >= 1;
  const color = goalReached ? "#1B5E20" : "#2E7D32";

  // Half circle: start at the left, go over the top, end at the right
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const height = center + strokeWidth / 2;
  const arcLength = Math.PI * radius;
  const arc = `M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`;

  // Event: tell the parent when the goal is reached
  const fireGoalReached = useEffectEvent(() => {
    onGoalReached?.({ savedKg, monthlyGoalKg });
  });
  useEffect(() => {
    if (goalReached) fireGoalReached();
  }, [goalReached]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${savedKg.toFixed(1)} kilograms of CO2 saved out of ${monthlyGoalKg}`}
    >
      <View style={{ width: size, height }}>
        <Svg width={size} height={height}>
          {/* grey track */}
          <Path
            d={arc}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
          {/* green part = progress towards the goal */}
          {progress > 0 && (
            <Path
              d={arc}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={arcLength * (1 - progress)}
            />
          )}
        </Svg>

        <View style={styles.label}>
          <Text style={[styles.value, { fontSize: size * 0.13, color }]}>
            {savedKg.toFixed(1)} kg
          </Text>
          <Text style={styles.caption}>
            CO₂ saved of {monthlyGoalKg} kg goal
          </Text>
          {wastedKg > 0 && (
            <Text style={styles.wasted}>{wastedKg.toFixed(1)} kg wasted</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  value: { fontWeight: "bold" },
  caption: { color: "#616161", fontSize: 13 },
  wasted: { color: "#C62828", fontSize: 13, marginTop: 2 },
});
