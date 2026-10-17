// Custom component: a half-circle gauge showing the food "rescue rate" (%),
// with a marker for the goal.
//
// Props:
//   value        0–100, the percentage to show (required)
//   goal         0–100, where the goal marker sits (default 90)
//   label        word under the number (default "rescued")
//   caption      small text under the label (optional)
//   size         width in px (default 240)
//   strokeWidth  arc thickness (default 18)
// Events:
//   onGoalReached  fired once when value reaches the goal
//   onPress        gauge tapped
import { useEffect, useEffectEvent } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

// Colour follows how well you are doing
function colorFor(value, goal) {
  if (value >= goal) return "#1B5E20"; // goal reached
  if (value >= 60) return "#2E7D32"; // good
  if (value >= 30) return "#F9A825"; // could be better
  return "#C62828"; // a lot is being thrown away
}

export default function RescueGauge({
  value,
  goal = 90,
  label = "rescued",
  caption,
  size = 240,
  strokeWidth = 18,
  onGoalReached,
  onPress,
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = clamped / 100;
  const goalReached = clamped >= goal;
  const color = colorFor(clamped, goal);

  // Half circle: start at the left, go over the top, end at the right
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const height = center + strokeWidth / 2;
  const arcLength = Math.PI * radius;
  const arc = `M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`;

  // Goal marker: the point on the arc at `goal` percent
  const goalAngle = Math.PI * (1 - goal / 100);
  const goalX = center + radius * Math.cos(goalAngle);
  const goalY = center - radius * Math.sin(goalAngle);

  // Event: tell the parent when the goal is reached
  const fireGoalReached = useEffectEvent(() => {
    onGoalReached?.({ value: clamped, goal });
  });
  useEffect(() => {
    if (goalReached) fireGoalReached();
  }, [goalReached]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${clamped} percent ${label}, goal ${goal} percent`}
    >
      <View style={{ width: size, height: height + 4 }}>
        <Svg width={size} height={height + 4}>
          {/* grey track */}
          <Path d={arc} stroke="#E0E0E0" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          {/* coloured part = the percentage */}
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
          {/* goal marker */}
          <Circle cx={goalX} cy={goalY} r={strokeWidth / 2 + 2} fill="#FFFFFF" stroke="#424242" strokeWidth={2} />
        </Svg>

        <View style={styles.label}>
          <Text style={[styles.value, { fontSize: size * 0.16, color }]}>{clamped}%</Text>
          <Text style={styles.word}>{label}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  value: { fontWeight: "bold" },
  word: { color: "#424242", fontSize: 15, fontWeight: "600" },
  caption: { color: "#616161", fontSize: 12, marginTop: 2 },
});
