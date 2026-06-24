import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, formatPrice } from "../api";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// Returns YYYY-MM-DD for `offsetDays` from today (local time).
function dateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const TIME_CHIPS = ["09:00", "11:00", "13:00", "15:00", "17:00"];

/**
 * Reusable booking sheet. Drives POST /bookings for the chosen service.
 *
 * Props:
 *   visible, onClose
 *   service      – the service row being booked
 *   providerName – label for the provider (optional)
 *   clientId     – the logged-in client's profile id
 *   onBooked     – callback(booking) after a successful create
 */
export default function BookingModal({
  visible,
  onClose,
  service,
  providerName,
  clientId,
  onBooked,
}) {
  const [serviceDate, setServiceDate] = useState(dateString(1));
  const [startTime, setStartTime] = useState("");
  const [address, setAddress] = useState("");
  const [atProvider, setAtProvider] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!service) return null;

  const reset = () => {
    setServiceDate(dateString(1));
    setStartTime("");
    setAddress("");
    setAtProvider(false);
    setNotes("");
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!clientId) {
      Alert.alert(
        "Profile incomplete",
        "We couldn't find your client profile. Open the Profile tab to finish setting it up before booking.",
      );
      return;
    }
    if (!DATE_RE.test(serviceDate)) {
      Alert.alert("Check the date", "Use the format YYYY-MM-DD.");
      return;
    }
    if (!TIME_RE.test(startTime)) {
      Alert.alert("Check the time", "Use a 24-hour time like 14:00.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Location required", "Tell the provider where to meet you.");
      return;
    }

    setSubmitting(true);
    try {
      const booking = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          service_id: service.id,
          service_date: serviceDate,
          start_time: startTime,
          service_location_address: address.trim(),
          is_at_provider_location: atProvider,
          client_notes: notes.trim() || undefined,
        }),
      });

      Alert.alert(
        "Booking requested",
        `Your ${service.service_name} on ${serviceDate} at ${startTime} is now pending the provider's confirmation.`,
      );
      reset();
      onClose();
      onBooked?.(booking);
    } catch (err) {
      Alert.alert("Booking failed", err.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <Text style={styles.sheetTitle}>Book service</Text>
            <TouchableOpacity onPress={close} hitSlop={10}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Service summary */}
            <View style={styles.summary}>
              <Text style={styles.serviceName}>{service.service_name}</Text>
              {providerName ? (
                <Text style={styles.providerName}>{providerName}</Text>
              ) : null}
              <View style={styles.summaryMeta}>
                <Text style={styles.price}>{formatPrice(service.price)}</Text>
                <Text style={styles.duration}>
                  · {service.duration_minutes} min
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={serviceDate}
              onChangeText={setServiceDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
            <View style={styles.chipRow}>
              <Chip
                label="Today"
                onPress={() => setServiceDate(dateString(0))}
              />
              <Chip
                label="Tomorrow"
                onPress={() => setServiceDate(dateString(1))}
              />
              <Chip
                label="Next week"
                onPress={() => setServiceDate(dateString(7))}
              />
            </View>

            <Text style={styles.label}>Start time</Text>
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM (e.g. 14:00)"
              placeholderTextColor="#999"
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.chipRow}>
              {TIME_CHIPS.map((t) => (
                <Chip key={t} label={t} onPress={() => setStartTime(t)} />
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>At the provider's location</Text>
                <Text style={styles.hint}>
                  Turn on if you'll go to them instead of being served at your
                  address.
                </Text>
              </View>
              <Switch
                value={atProvider}
                onValueChange={setAtProvider}
                trackColor={{ true: "#f48fb1", false: "#ccc" }}
                thumbColor={atProvider ? "#d81b60" : "#f4f4f4"}
              />
            </View>

            <Text style={styles.label}>Location address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. 12 Riverside Dr, Nairobi"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything the provider should know"
              placeholderTextColor="#999"
              multiline
            />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatPrice(service.price)}
              </Text>
            </View>
            {submitting ? (
              <View style={[styles.confirmButton, styles.confirmDisabled]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>Confirm booking</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chip({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    paddingBottom: 8,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sheetTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  body: { padding: 20, paddingBottom: 12 },
  summary: {
    backgroundColor: "#fce4ec",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  serviceName: { fontSize: 17, fontWeight: "bold", color: "#880e4f" },
  providerName: { fontSize: 13, color: "#ad1457", marginTop: 2 },
  summaryMeta: { flexDirection: "row", alignItems: "baseline", marginTop: 8 },
  price: { fontSize: 16, fontWeight: "bold", color: "#d81b60" },
  duration: { fontSize: 14, color: "#ad1457", marginLeft: 6 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 6,
  },
  hint: { fontSize: 12, color: "#888", marginBottom: 4 },
  input: {
    height: 50,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#333",
  },
  multiline: { height: 90, paddingTop: 12, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d81b60",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { color: "#d81b60", fontSize: 13, fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalLabel: { fontSize: 15, color: "#666" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#333" },
  confirmButton: {
    backgroundColor: "#d81b60",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDisabled: { opacity: 0.7 },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
