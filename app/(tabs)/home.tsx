import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useSettings } from '../../context/SettingsContext';

// --- NEW: Import the notifications library ---
import * as Notifications from 'expo-notifications';

// --- Tell the app how to handle notifications when it is open ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // <--- Replaced shouldShowAlert
    shouldShowList: true,   // <--- Added to fix the deprecation warning
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const screenWidth = Dimensions.get('window').width;

// --- Custom SVG Gas Gauge Component (Calibrated to 2000 ppm Alarm) ---
const GasGauge = ({ value, max, unit, activeColor }: { value: number; max: number; unit: string; activeColor: string }) => {
  const clampedValue = Math.min(Math.max(value, 0), max);
  const rotation = (clampedValue / max) * 180;

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI - (i * (Math.PI / 10)); 
      const innerRadius = 70; 
      
      const isMajorTick = i === 0 || i === 2 || i === 4 || i === 10; 
      const tickLength = isMajorTick ? 8 : 4; 
      
      const x1 = 100 + innerRadius * Math.cos(angle);
      const y1 = 100 - innerRadius * Math.sin(angle);
      const x2 = 100 + (innerRadius - tickLength) * Math.cos(angle);
      const y2 = 100 - (innerRadius - tickLength) * Math.sin(angle);

      ticks.push(<Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#999" strokeWidth={isMajorTick ? 2 : 1} />);
    }
    return ticks;
  };

  return (
    <View style={styles.gaugeContainer}>
      <Svg width="220" height="120" viewBox="0 0 200 110">
        <Path d="M 20 100 A 80 80 0 0 1 35.28 52.98" fill="none" stroke="#4CAF50" strokeWidth="20" />
        <Path d="M 35.28 52.98 A 80 80 0 0 1 75.28 23.9" fill="none" stroke="#FF9800" strokeWidth="20" />
        <Path d="M 75.28 23.9 A 80 80 0 0 1 180 100" fill="none" stroke="#F44336" strokeWidth="20" />

        {renderTicks()}

        <SvgText x="40" y="102" fill="#888" fontSize="10" textAnchor="middle" fontWeight="500">0</SvgText>
        <SvgText x="60" y="65" fill="#888" fontSize="10" textAnchor="middle" fontWeight="500">{unit === 'ppm' ? '1000' : '4.8'}</SvgText>
        <SvgText x="80" y="50" fill="#888" fontSize="10" textAnchor="middle" fontWeight="500">{unit === 'ppm' ? '2000' : '9.5'}</SvgText>
        <SvgText x="150" y="102" fill="#888" fontSize="10" textAnchor="middle" fontWeight="500">{Number(max.toFixed(1))}</SvgText>

        <G rotation={rotation} origin="100, 100">
          <Polygon points="100,96 100,104 35,100" fill={activeColor} />
          <Circle cx="100" cy="100" r="8" fill={activeColor} />
        </G>
      </Svg>
      <Text style={[styles.gaugeValueText, { color: activeColor }]}>
        {value} {unit}
      </Text>
    </View>
  );
};

export default function Home() {
  const { displayUnit, threshold, soundEnabled, vibrationEnabled, addLog } = useSettings();
  
  const [currentPpm, setCurrentPpm] = useState(0); 
  
  // --- UPDATED: Expand array to hold 24 hours of data ---
  const [graphData, setGraphData] = useState<number[]>(new Array(24).fill(0));

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    })();
  }, []);

  // --- UPDATED: Handle 24 hours of labels with 6-hour intervals ---
  const getInitialLabels = () => {
    const labels = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      // Only show the text label every 6 hours or for the current hour
      if (i % 6 === 0 || i === 0) {
        const pastTime = new Date(now.getTime() - i * 3600000); 
        let hours = pastTime.getHours();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        labels.push(`${hours}${ampm}`);
      } else {
        // Push an empty string so the graph point exists, but no text is drawn
        labels.push("");
      }
    }
    return labels;
  };
  
  const [graphLabels, setGraphLabels] = useState<string[]>(getInitialLabels());

  const numericThreshold = parseFloat(threshold) || 2000;
  const isDanger = currentPpm >= numericThreshold;

  const currentAmPm = new Date().getHours() >= 12 ? 'pm' : 'am';

  const hasLoggedAlarm = useRef(false);

  useEffect(() => {
    if (isDanger && !hasLoggedAlarm.current) {
      const now = new Date();
      
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeStr = `${hours}:${now.getMinutes().toString().padStart(2, '0')} ${ampm}`;
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

      addLog({
        id: Date.now().toString(),
        date: dateStr,
        time: timeStr,
        peak: currentPpm 
      });

      Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ GAS LEAK DETECTED!",
          body: `Danger: Gas concentration has reached ${currentPpm} ppm. Please investigate immediately!`,
          sound: true,
        },
        trigger: null, 
      });

      hasLoggedAlarm.current = true; 
    } else if (!isDanger) {
      hasLoggedAlarm.current = false; 
    }
  }, [isDanger, currentPpm, addLog]);

  useEffect(() => {
    let soundObject: Audio.Sound | null = null;

    const manageAlarm = async () => {
      if (isDanger) {
        if (vibrationEnabled) {
          Vibration.vibrate([0, 1000, 1000], true);
        }
        
        if (soundEnabled) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              require('../../assets/alarm.wav'), 
              { isLooping: true }
            );
            soundObject = sound;
            await soundObject.playAsync();
          } catch (error) {
            console.log("Could not load alarm sound.", error);
          }
        }
      } else {
        Vibration.cancel();
        if (soundObject) {
          await soundObject.stopAsync();
          await soundObject.unloadAsync();
          soundObject = null;
        }
      }
    };

    manageAlarm();

    return () => {
      Vibration.cancel();
      if (soundObject) {
        soundObject.stopAsync();
        soundObject.unloadAsync();
      }
    };
  }, [isDanger, soundEnabled, vibrationEnabled]); 


  const displayValue = displayUnit === 'ppm' ? currentPpm : parseFloat((currentPpm / 210).toFixed(2));
  const gaugeMax = displayUnit === 'ppm' ? 5000 : 23.8; 

  let statusText = "Air is safe";
  let statusColor = "#4CAF50"; 
  let statusIcon: keyof typeof Ionicons.glyphMap = "checkbox";
  let statusDetail = "No leak or minimal background presence";

  if (isDanger) {
    statusText = "Danger: Alarm Triggered!";
    statusColor = "#F44336"; 
    statusIcon = "warning";
    statusDetail = "Gas concentration has exceeded safe limits!";
  } else if (currentPpm >= 1000) {
    statusText = "Caution: Early Warning";
    statusColor = "#FF9800"; 
    statusIcon = "alert-circle";
    statusDetail = "Small leak may be present. Investigate.";
  } else if (currentPpm > 500) {
    statusText = "Notice: Elevated Levels";
    statusColor = "#FFC107"; 
    statusIcon = "information-circle";
    statusDetail = "Gas presence is slightly above normal.";
  }

  const triggerTestLeak = () => {
    const newPpm = currentPpm === 0 ? 2500 : 0;
    setCurrentPpm(newPpm);
    setGraphData(prev => [...prev.slice(1), newPpm]);

    // --- NEW FIX: Recalculate clean labels instead of injecting text ---
    setGraphLabels(getInitialLabels());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>Gas Guard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Gas Detection</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: '#ccc' }]} />
            <Text style={styles.statusText}>Disconnected</Text>
          </View>
        </View>

        <View style={styles.card}>
          <GasGauge value={displayValue} max={gaugeMax} unit={displayUnit} activeColor={statusColor} />
        </View>

        <View style={styles.card}>
          <View style={{ position: 'relative', paddingTop: 15, paddingBottom: 10 }}>
            
            <Text style={{ position: 'absolute', top: -5, left: 10, fontSize: 12, color: '#888', fontWeight: 'bold', zIndex: 1 }}>
              {displayUnit === 'ppm' ? 'ppm' : '%LEL'}
            </Text>

            <LineChart
              data={{ 
                labels: graphLabels, 
                datasets: [{ data: graphData }] 
              }}
              width={screenWidth - 60} 
              height={220}
              yAxisSuffix="" 
              
              // Hint: If 24 dots looks too crowded on your phone screen, 
              // change this to withDots={false} to make it a smooth continuous line!
              withDots={true} 

              withOuterLines={false} 
              withInnerLines={true} 
              withHorizontalLines={true} 
              withVerticalLines={false} 
              fromZero={true} 
              withShadow={false} 
              chartConfig={{ 
                backgroundColor: "#ffffff", 
                backgroundGradientFrom: "#ffffff", 
                backgroundGradientTo: "#ffffff", 

                decimalPlaces: displayUnit === 'ppm' ? 0 : 1, 

                color: () => `rgba(26, 26, 36, 1)`, 
                labelColor: () => `rgba(136, 136, 136, 1)`, 
                strokeWidth: 3, 

                propsForBackgroundLines: {
                  stroke: '#E0E0E0', 
                  strokeWidth: 1, 
                  strokeDasharray: "" 
                }
              }}
              bezier 
              style={styles.chart}
            />

            <Text style={{ position: 'absolute', bottom: -5, right: 0, fontSize: 12, color: '#888', fontWeight: 'bold' }}>
              Time({currentAmPm})
            </Text>
          </View>
        </View>

        <View style={[styles.card, { borderWidth: 2, borderColor: isDanger ? '#F44336' : 'transparent' }]}>
          <View style={styles.statusHeader}>
            <Ionicons name={statusIcon} size={28} color={statusColor} />
            <Text style={[styles.statusSafeText, { color: statusColor }]}>{statusText}</Text>
          </View>
          <Text style={styles.statusDetail}>{statusDetail}</Text>
          <View style={styles.divider} />
          <Text style={styles.statusDataText}>Current: {displayValue} {displayUnit}</Text>
          <Text style={styles.statusDataText}>Alarm threshold: {threshold} {displayUnit}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.testButton, isDanger && { backgroundColor: '#F44336' }]} 
          onPress={triggerTestLeak}
        >
          <Text style={styles.testButtonText}>
            {isDanger ? "Stop Leak" : "Simulate Leak (Test Alarm)"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  topBar: { alignItems: 'center', paddingVertical: 15, backgroundColor: '#fff' },
  appTitle: { fontSize: 20, fontWeight: '500' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#999', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  gaugeContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  gaugeValueText: { fontSize: 25, fontWeight: '600', marginTop: 10 },
  chart: { marginLeft: -20 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusSafeText: { fontSize: 20, fontWeight: '600', marginLeft: 10 },
  statusDetail: { fontSize: 14, color: '#444', marginBottom: 10, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  statusDataText: { fontSize: 14, color: '#888', marginBottom: 4 },
  testButton: { backgroundColor: '#1A1A24', paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  testButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});