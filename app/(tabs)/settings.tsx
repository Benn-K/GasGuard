import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../context/SettingsContext';

export default function Settings() {
  const { 
    displayUnit, setDisplayUnit, 
    threshold, setThreshold,
    soundEnabled, setSoundEnabled,
    vibrationEnabled, setVibrationEnabled
  } = useSettings();
  
  const handleUnitToggle = (newUnit: 'LEL' | 'ppm') => {
    if (newUnit === displayUnit) return; 

    const currentNum = parseFloat(threshold) || 0;
    
    if (newUnit === 'LEL') {
      setThreshold((currentNum / 210).toFixed(2).replace(/\.00$/, '')); 
    } else {
      const rawPpm = currentNum * 210;
      const roundedPpm = Math.round(rawPpm / 10) * 10; 
      setThreshold(roundedPpm.toString());
    }
    
    setDisplayUnit(newUnit);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
          
          <View style={[styles.row, { marginTop: 15 }]}>
            <Text style={styles.rowLabel}>Last connected</Text>
            <Text style={styles.rowValue}>Not recorded</Text>
          </View>
          <Text style={styles.footerText}>
            If you need support, screenshot this page and send it to us.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Display unit</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity 
              style={[styles.segmentButton, displayUnit === 'LEL' && styles.segmentActive]}
              onPress={() => handleUnitToggle('LEL')}
            >
              <Text style={[styles.segmentText, displayUnit === 'LEL' && styles.segmentTextActive]}>%LEL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentButton, displayUnit === 'ppm' && styles.segmentActive]}
              onPress={() => handleUnitToggle('ppm')}
            >
              <Text style={[styles.segmentText, displayUnit === 'ppm' && styles.segmentTextActive]}>ppm</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            After switching, the dashboard and alarm threshold will use the same unit.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alarm threshold</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input}
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.inputUnit}>{displayUnit}</Text>
          </View>
          <Text style={styles.footerText}>
            Default ~10%LEL (2000 ppm). The threshold affects background flashing and alarm sound.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.cardTitle}>Alarm sound</Text>
              <Text style={styles.subText}>When exceeded, A loud beeping siren audio will continue to play</Text>
            </View>
            <Switch
              trackColor={{ false: '#e3e3e3', true: '#4CAF50' }}
              thumbColor={'#fff'}
              ios_backgroundColor="#e3e3e3"
              onValueChange={setSoundEnabled}
              value={soundEnabled}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.cardTitle}>Alarm vibration</Text>
              <Text style={styles.subText}>Vibrate continuously when threshold is exceeded</Text>
            </View>
            <Switch
              trackColor={{ false: '#e3e3e3', true: '#4CAF50' }} 
              thumbColor={'#fff'}
              ios_backgroundColor="#e3e3e3"
              onValueChange={setVibrationEnabled}
              value={vibrationEnabled}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  topBar: { alignItems: 'center', paddingVertical: 15, backgroundColor: '#fff' },
  appTitle: { fontSize: 18, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 16, color: '#666' },
  rowValue: { fontSize: 16, color: '#000' },
  footerText: { fontSize: 13, color: '#999', marginTop: 15, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15, color: '#000' },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 25, padding: 4 },
  segmentButton: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  segmentActive: { backgroundColor: '#000000ff' },
  segmentText: { fontSize: 15, color: '#666', fontWeight: '500' },
  segmentTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputContainer: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 },
  input: { fontSize: 16, color: '#000' },
  inputUnit: { fontSize: 16, color: '#666', width: 40 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchTextContainer: { flex: 1, paddingRight: 15 },
  subText: { fontSize: 13, color: '#888', lineHeight: 18, marginTop: -5 }
});