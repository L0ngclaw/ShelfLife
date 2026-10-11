// Shows short confirmation messages ("Milk added") from any screen
import { createContext, useContext, useState } from "react";
import { StyleSheet } from "react-native";
import { Snackbar } from "react-native-paper";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [message, setMessage] = useState("");

  return (
    <FeedbackContext.Provider value={{ showMessage: setMessage }}>
      {children}
      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage("")}
        duration={3000}
        wrapperStyle={styles.wrapper}
      >
        {message}
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);

const styles = StyleSheet.create({
  wrapper: { bottom: 64 }, // sit above the bottom tabs
});
