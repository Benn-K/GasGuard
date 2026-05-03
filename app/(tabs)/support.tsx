import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Support() {
  const [userEmail, setUserEmail] = useState(''); 
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const SUPPORT_EMAIL = 'gasleakdetector2026@gmail.com'; 

  const handleSendEmail = async () => {
    // Check if they filled out all three fields
    if (!userEmail.trim() || !subject.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please fill out all fields before sending.');
      return;
    }

    setIsSending(true);

    try {
      // THE FIX: Pointing to Formspree using a clean JSON payload!
      const response = await fetch("https://formspree.io/f/xgopwagk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: userEmail,
          subject: `Issue: ${subject}`,
          message: message,
        }),
      });

      const data = await response.json();

      // Formspree checks if the response is "ok"
      if (response.ok) {
        Alert.alert('Success!', 'Your message has been securely sent to our support team.');
        setUserEmail('');
        setSubject('');
        setMessage('');
      } else {
        Alert.alert('Error', data.error || 'There was an issue sending your message.');
        console.log("Server response:", data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>Support</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubbles-outline" size={32} color="#2196F3" />
            </View>
            <Text style={styles.headerTitle}>How can we help?</Text>
            <Text style={styles.headerSubtitle}>
              Experiencing hardware issues or app bugs? Send us a message and our team will investigate.
            </Text>
          </View>

          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={20} color="#888" />
              <Text style={styles.contactText}>{SUPPORT_EMAIL}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            {/* Email Input Field */}
            <Text style={styles.formLabel}>Your Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., name@example.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={userEmail}
              onChangeText={setUserEmail}
              editable={!isSending} 
            />

            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sensor won't connect"
              placeholderTextColor="#aaa"
              value={subject}
              onChangeText={setSubject}
              editable={!isSending} 
            />

            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the issue you are facing..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              editable={!isSending} 
            />

            <TouchableOpacity 
              style={[styles.submitButton, isSending && { opacity: 0.7 }]} 
              onPress={handleSendEmail}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.submitButtonText}>
                {isSending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  topBar: { alignItems: 'center', paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  appTitle: { fontSize: 18, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A24', marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  contactCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactText: { marginLeft: 10, fontSize: 14, color: '#444', fontWeight: '500' },
  formCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A24', marginBottom: 8 },
  input: { backgroundColor: '#F5F6F8', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: '#333', marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { minHeight: 120, paddingTop: 15 },
  submitButton: { backgroundColor: '#1A1A24', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 10, marginTop: 10 },
  submitButtonText: { color: '#F5F6F8', fontSize: 16, fontWeight: '600' }
});