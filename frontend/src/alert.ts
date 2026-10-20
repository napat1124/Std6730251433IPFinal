import { Alert, Platform } from "react-native";

// Alert.alert กดปุ่มไม่ได้บนเว็บ จึงใช้ window.alert / confirm แทน
export function showAlert(title: string, message: string) {
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

export function confirmAlert(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
