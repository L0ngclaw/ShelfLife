// Custom component: a ring showing how much of an item's shelf life is left.
//
// Props:
//   purchaseDate, expiryDate  'YYYY-MM-DD' (required)
//   size          diameter in px (default 44)
//   strokeWidth   ring thickness (default 5)
//   showLabel     show days left in the centre (default true)
// Events:
//   onPress         ring tapped
//   onExpiringSoon  fired when the item becomes urgent (red)
//   onExpired       fired when the item is expired (grey)
import { useEffect, useEffectEvent, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getExpiryStatus } from "../utils/expiryStatus";

export default function ExpiryRing({
  purchaseDate,
  expiryDate,
  size = 44,
  strokeWidth = 5,
  showLabel = true,
  onPress,
  onExpiringSoon,
  onExpired,
}) {
  const status = getExpiryStatus(purchaseDate, expiryDate);

  // Ring maths: the coloured circle is "cut" using a dash offset
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - status.fractionLeft);

  // Events: tell the parent when the level becomes urgent or expired
  const fireLevelEvent = useEffectEvent((level) => {
    if (level === "urgent") onExpiringSoon?.(status);
    if (level === "expired") onExpired?.(status);
  });
  useEffect(() => {
    fireLevelEvent(status.level);
  }, [status.level]);

  // Pulse animation while urgent
  const [scale] = useState(() => new Animated.Value(1));
  const urgent = status.level === "urgent";
  useEffect(() => {
    if (!urgent) {
      scale.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop(); // stop when not urgent or when the ring is removed
  }, [urgent, scale]);

  const expired = status.level === "expired";
  const label = expired
    ? "Expired"
    : `${status.days} day${status.days === 1 ? "" : "s"} left`;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label}
    >
      <Animated.View
        style={{ width: size, height: size, transform: [{ scale }] }}
      >
        <Svg width={size} height={size} style={styles.rotate}>
          {/* grey background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* coloured part = shelf life left */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap={status.fractionLeft > 0 ? "round" : "butt"}
          />
        </Svg>

        {showLabel && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text
              style={[
                styles.days,
                { fontSize: size * 0.34, color: status.color },
              ]}
            >
              {expired ? "!" : status.days}
            </Text>
            {size >= 64 && !expired && (
              <Text style={[styles.unit, { fontSize: size * 0.13 }]}>
                {status.days === 1 ? "day" : "days"}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: "-90deg" }] }, // start the ring at the top
  center: { alignItems: "center", justifyContent: "center" },
  days: { fontWeight: "bold" },
  unit: { color: "#616161" },
});
