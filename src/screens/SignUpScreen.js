import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useAuth, friendlyAuthError } from "../context/AuthContext";

export default function SignUpScreen() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validate on the device first, so we don't waste a network call
    if (!email || !password) return setError("Please fill in all fields.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setError("");
    setLoading(true);
    try {
      await signup(email, password); // logs the user in automatically
    } catch (e) {
      setError(friendlyAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        label="Password"
        mode="outlined"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        label="Confirm password"
        mode="outlined"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.input}
      />

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        disabled={loading}
      >
        Create account
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  input: { marginBottom: 12 },
});
