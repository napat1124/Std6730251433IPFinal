import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { showAlert } from "@/alert";
import { API_URL } from "@/config";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showAlert("Login failed", "Please enter username and password");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.token) {
        showAlert("Login failed", data.message || "Invalid username or password");
        return;
      }
      await AsyncStorage.setItem("token", data.token);
      router.replace("/");
    } catch {
      showAlert("Network error", "Cannot connect to server. Check API_URL in src/config.ts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.logo}><Text style={styles.logoText}>HR</Text></View>
        <Text style={styles.title}>HR Manager</Text>
        <Text style={styles.sub}>Employee & Salary Analytics</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} placeholder="admin" placeholderTextColor="#4d5f54"
          value={username} onChangeText={setUsername} autoCapitalize="none" />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#4d5f54"
          value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={handleLogin} />

        <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#04130a" /> : <Text style={styles.btnText}>Sign In</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#070a08" },
  card: {
    width: "100%", maxWidth: 400, backgroundColor: "#111713", borderRadius: 20, padding: 32, borderWidth: 1, borderColor: "#1c2620",
    shadowColor: "#1fe07a", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#1fe07a", alignSelf: "center", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  logoText: { color: "#04130a", fontSize: 24, fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", color: "#e9f7ee", letterSpacing: 0.5 },
  sub: { textAlign: "center", color: "#7d8f84", marginTop: 4, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: "700", color: "#a9c2b2", marginBottom: 6 },
  input: { backgroundColor: "#0d120f", borderWidth: 1, borderColor: "#25322a", borderRadius: 10, padding: 13, marginBottom: 16, fontSize: 15, color: "#e9f7ee" },
  btn: { backgroundColor: "#1fe07a", shadowColor: "#1fe07a", shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, padding: 15, borderRadius: 10, alignItems: "center", marginTop: 6 },
  btnText: { color: "#04130a", fontWeight: "700", fontSize: 16 },
});
