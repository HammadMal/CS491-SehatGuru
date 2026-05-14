import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fonts } from "../constants/fonts";
import { useInAppNotificationStore } from "../store/useInAppNotificationStore";

export function InAppNotificationHost() {
  const insets = useSafeAreaInsets();
  const { notification, visible } = useInAppNotificationStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible]);

  if (!notification) return null;

  const isSuccess = notification.tone === "success";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.card, isSuccess ? styles.successCard : styles.infoCard]}>
        <View style={[styles.iconWrap, isSuccess ? styles.successIcon : styles.infoIcon]}>
          <Ionicons
            name={isSuccess ? "trophy-outline" : "notifications-outline"}
            size={16}
            color={isSuccess ? "#166534" : "#1d4ed8"}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  successCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  infoCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  successIcon: {
    backgroundColor: "#dcfce7",
  },
  infoIcon: {
    backgroundColor: "#dbeafe",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: "#111827",
    marginBottom: 2,
  },
  message: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 17,
  },
});
