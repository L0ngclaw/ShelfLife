// Small header button that looks like a mini expiry ring split into the four
// expiry colours, with a "?" in the middle. Tapping it opens the colour guide.
//
// Props:  onPress (function), size (number, default 30)
import { Pressable, View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { EXPIRY_LEVELS } from "../utils/expiryStatus";

const COLORS = ["fresh", "soon", "urgent", "expired"].map((l) => EXPIRY_LEVELS[l].color);

export default function ColorKeyButton({ onPress, size = 30 }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 3; // small gap between the coloured parts
  const segment = circumference / COLORS.length - gap;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="What do the ring colours mean?"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={styles.rotate}>
          {COLORS.map((color, i) => (
            <Circle
              key={color}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${segment} ${circumference - segment}`}
              strokeDashoffset={-i * (circumference / COLORS.length)}
            />
          ))}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.mark, { fontSize: size * 0.45 }]}>?</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 16, borderRadius: 20 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.92 }] },
  rotate: { transform: [{ rotate: "-90deg" }] },
  center: { alignItems: "center", justifyContent: "center" },
  mark: { fontWeight: "bold", color: "#424242" },
});
