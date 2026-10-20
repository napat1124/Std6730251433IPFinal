import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { confirmAlert, showAlert } from "@/alert";
import { API_URL } from "@/config";

interface Employee {
  id: string;
  name: string;
  position: string;
  status: "Active" | "On Leave";
  salary: number;
}

interface Cluster {
  group: string;
  centroid: number;
  count: number;
}

const fmt = (n: number) => `฿${Number(n).toLocaleString("en-US")}`;

export default function Dashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }, []);

  // ส่ง token ทุกครั้ง + จัดการ 401 / error
  const api = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      await logout();
      throw new Error("Session expired, please log in again");
    }
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  }, [logout]);

  const loadEmployees = useCallback(async () => {
    setLoadingList(true);
    try {
      const q = search.trim();
      const data = await api(q ? `/api/employees?q=${encodeURIComponent(q)}` : "/api/employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showAlert("Error", e.message || "Cannot load employees");
    } finally {
      setLoadingList(false);
    }
  }, [api, search]);

  // reload when search text changes (small delay so it doesn't call API on every key)
  useEffect(() => {
    const t = setTimeout(() => { loadEmployees(); }, 300);
    return () => clearTimeout(t);
  }, [loadEmployees]);

  const resetForm = () => {
    setName(""); setPosition(""); setSalary(""); setEditingId(null);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setName(emp.name);
    setPosition(emp.position);
    setSalary(String(emp.salary));
  };

  const saveEmployee = async () => {
    // Client-side validation
    if (!name.trim() || !position.trim() || !salary.trim()) {
      showAlert("Validation", "Please fill in name, position and salary");
      return;
    }
    const s = Number(salary);
    if (!Number.isFinite(s) || s < 0) {
      showAlert("Validation", "Salary must be a valid positive number");
      return;
    }
    try {
      const body = JSON.stringify({ name: name.trim(), position: position.trim(), salary: s });
      if (editingId) {
        await api(`/api/employees/${editingId}`, { method: "PUT", body });
        showAlert("Saved", "Employee updated");
      } else {
        await api("/api/employees", { method: "POST", body });
      }
      resetForm();
      setClusters(null);
      await loadEmployees();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await api(`/api/employees/${id}/status`, { method: "PUT" });
      await loadEmployees();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const deleteEmployee = (emp: Employee) => {
    confirmAlert("Are you sure?", `Delete ${emp.name}?`, async () => {
      try {
        await api(`/api/employees/${emp.id}`, { method: "DELETE" });
        if (editingId === emp.id) resetForm();
        setClusters(null);
        await loadEmployees();
      } catch (e: any) {
        showAlert("Error", e.message);
      }
    });
  };

  const analyze = async () => {
    setAnalyzing(true);
    setClusters(null);
    try {
      const data = await api("/api/employees/salary-clusters");
      setClusters(data.clusters || []);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const avgSalary = employees.length
    ? Math.round(employees.reduce((sum, e) => sum + e.salary, 0) / employees.length)
    : 0;
  const tierColors = ["#1fe07a", "#b6ff3b", "#00e0c6"];
  const initials = (n: string) =>
    n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  const header = (
    <View>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>HR Dashboard</Text>
          <Text style={styles.subtitle}>Manage employees & analyze salaries</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: "#1fe07a" }]}>{employees.length}</Text><Text style={styles.statLabel}>Employees</Text></View>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: "#b6ff3b" }]}>{activeCount}</Text><Text style={styles.statLabel}>Active</Text></View>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: "#f5b942" }]}>{employees.length - activeCount}</Text><Text style={styles.statLabel}>On Leave</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{fmt(avgSalary)}</Text><Text style={styles.statLabel}>Avg Salary</Text></View>
      </View>

      {/* Form */}
      <View style={[styles.card, editingId ? { borderColor: "#1fe07a", borderWidth: 2 } : null]}>
        <Text style={styles.section}>{editingId ? "EDIT EMPLOYEE" : "ADD EMPLOYEE"}</Text>
        <View style={styles.formRow}>
          <TextInput style={[styles.input, styles.flex2]} placeholder="Name" placeholderTextColor="#4d5f54" value={name} onChangeText={setName} />
          <TextInput style={[styles.input, styles.flex2]} placeholder="Position" placeholderTextColor="#4d5f54" value={position} onChangeText={setPosition} />
          <TextInput style={[styles.input, styles.flex1]} placeholder="Salary" placeholderTextColor="#4d5f54" value={salary} onChangeText={setSalary} keyboardType="numeric" />
        </View>
        <View style={styles.formRow}>
          <Pressable style={[styles.btn, { backgroundColor: editingId ? "#1fe07a" : "#1fe07a", flex: 1 }]} onPress={saveEmployee}>
            <Text style={styles.btnText}>{editingId ? "Save Changes" : "Add Employee"}</Text>
          </Pressable>
          {editingId && (
            <Pressable style={[styles.btn, { backgroundColor: "#1c2620" }]} onPress={resetForm}>
              <Text style={[styles.btnText, { color: "#cfe3d6" }]}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* K-Means */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.section}>SALARY STRUCTURE</Text>
            <Text style={styles.muted}>Group salaries into 3 tiers with K-Means clustering</Text>
          </View>
          <Pressable style={[styles.btn, { backgroundColor: "#1fe07a" }]} onPress={analyze} disabled={analyzing}>
            <Text style={styles.btnText}>Analyze Salary Structure</Text>
          </Pressable>
        </View>
        {analyzing && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#1fe07a" />
            <Text style={[styles.muted, { marginTop: 8 }]}>Analyzing salaries...</Text>
          </View>
        )}
        {clusters && !analyzing && (
          clusters.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 12 }]}>No salary data to analyze.</Text>
          ) : (
            <View style={styles.tierRow}>
              {clusters.map((c, i) => (
                <View key={c.group} style={[styles.tierCard, { borderTopColor: tierColors[i % 3] }]}>
                  <Text style={[styles.tierName, { color: tierColors[i % 3] }]}>{c.group}</Text>
                  <Text style={styles.tierValue}>{fmt(c.centroid)}</Text>
                  <Text style={styles.muted}>average salary</Text>
                  <View style={[styles.countPill, { backgroundColor: tierColors[i % 3] + "22" }]}>
                    <Text style={{ color: tierColors[i % 3], fontWeight: "700" }}>
                      {c.count} employee{c.count > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </View>

      {/* List header + search */}
      <View style={[styles.rowBetween, { marginTop: 8, marginBottom: 10 }]}>
        <Text style={styles.section}>
          Employees <Text style={styles.muted}>({employees.length}){loadingList ? " …" : ""}</Text>
        </Text>
      </View>
      <TextInput
        style={[styles.input, styles.search]}
        placeholder="Search by name, position or status..."
        placeholderTextColor="#4d5f54"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070a08" }}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={loadingList ? null : (
          <Text style={[styles.muted, { textAlign: "center", padding: 24 }]}>
            {search.trim() ? "No matching employees" : "No employees"}
          </Text>
        )}
        style={{ width: "100%" }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={[styles.item, editingId === item.id && { borderColor: "#1fe07a", borderWidth: 2 }]}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.name)}</Text></View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.muted}>{item.position}</Text>
              <View style={[styles.rowStart, { marginTop: 6 }]}>
                <Text style={[styles.badge, item.status === "Active" ? styles.active : styles.leave]}>● {item.status}</Text>
                <Text style={styles.salary}>{fmt(item.salary)}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#1c2620" }]} onPress={() => startEdit(item)}>
                <Text style={[styles.actionText, { color: "#e9f7ee" }]}>Edit</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#0f2a1b" }]} onPress={() => toggleStatus(item.id)}>
                <Text style={[styles.actionText, { color: "#1fe07a" }]}>Toggle Status</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { backgroundColor: "#2a1212" }]} onPress={() => deleteEmployee(item)}>
                <Text style={[styles.actionText, { color: "#ff6b6b" }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 1000, alignSelf: "center", padding: 16, paddingBottom: 48 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#0d120f", borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: "#1c2620", borderLeftWidth: 4, borderLeftColor: "#1fe07a", shadowColor: "#1fe07a", shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  title: { fontSize: 26, fontWeight: "900", color: "#e9f7ee", letterSpacing: 0.5 },
  subtitle: { color: "#7d8f84", marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: "#ff6b6b", backgroundColor: "transparent", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  logoutText: { color: "#ff6b6b", fontWeight: "700" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, flexBasis: 140, backgroundColor: "#111713", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#1c2620" },
  statValue: { fontSize: 24, fontWeight: "900", color: "#e9f7ee" },
  statLabel: { color: "#7d8f84", marginTop: 2, fontSize: 13 },
  card: { backgroundColor: "#111713", borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#1c2620" },
  section: { fontSize: 15, fontWeight: "900", color: "#e9f7ee", marginBottom: 4, letterSpacing: 1 },
  muted: { color: "#7d8f84", fontSize: 13 },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  flex2: { flexGrow: 2, flexBasis: 180 },
  flex1: { flexGrow: 1, flexBasis: 120 },
  input: { backgroundColor: "#0d120f", borderWidth: 1, borderColor: "#25322a", borderRadius: 10, padding: 12, fontSize: 15, color: "#e9f7ee" },
  search: { backgroundColor: "#111713", marginBottom: 12 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: "center", justifyContent: "center", shadowColor: "#1fe07a", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  btnText: { color: "#04130a", fontWeight: "800", letterSpacing: 0.3 },
  rowBetween: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" },
  rowStart: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  tierRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  tierCard: { flexGrow: 1, flexBasis: 160, backgroundColor: "#0d120f", borderRadius: 12, padding: 16, borderTopWidth: 4, borderWidth: 1, borderColor: "#1c2620" },
  tierName: { fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  tierValue: { fontSize: 22, fontWeight: "800", color: "#e9f7ee", marginTop: 6 },
  countPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  item: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14, backgroundColor: "#111713", borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1c2620" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#0f2a1b", borderWidth: 1, borderColor: "#1fe07a", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#1fe07a", fontWeight: "800" },
  name: { fontSize: 16, fontWeight: "700", color: "#e9f7ee" },
  salary: { fontWeight: "700", color: "#e9f7ee" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, overflow: "hidden", fontSize: 12, fontWeight: "700" },
  active: { backgroundColor: "rgba(31,224,122,0.15)", color: "#1fe07a" },
  leave: { backgroundColor: "rgba(245,185,66,0.15)", color: "#f5b942" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { fontWeight: "700", fontSize: 13 },
});
