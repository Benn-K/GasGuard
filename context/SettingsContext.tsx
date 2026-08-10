import AsyncStorage from '@react-native-async-storage/async-storage';
import { onValue, ref, remove, set, update } from 'firebase/database';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

type DisplayUnit = 'LEL' | 'ppm';

export interface AlarmLog {
  id: string;
  date: string;
  time: string;
  peak: number;
}

interface SettingsContextType {
  displayUnit: DisplayUnit;
  setDisplayUnit: (unit: DisplayUnit) => void;
  threshold: string;
  setThreshold: (val: string, activeUnit?: DisplayUnit) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (val: boolean) => void;
  logs: AlarmLog[];
  addLog: (log: AlarmLog) => void;
  clearLogs: () => void; 
  deleteLogs: (ids: string[]) => void;
  lastConnected: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('ppm');
  const [threshold, setThresholdState] = useState('2000'); 
  const [soundEnabled, setSoundEnabled] = useState(true); 
  const [vibrationEnabled, setVibrationEnabled] = useState(true); 
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [lastConnected, setLastConnected] = useState("Waiting for sensor...");

  const setThreshold = (val: string, activeUnit: DisplayUnit = displayUnit) => {
    setThresholdState(val); 
    try {
      // Always normalize to PPM for Firebase and hardware consistency
      const ppmValue = activeUnit === 'ppm' ? Number(val) : Math.round(Number(val) * 210);
      set(ref(db, 'sensor/settings/threshold'), ppmValue);
    } catch (error) {
      console.error("Failed to push threshold to Firebase:", error);
    }
  };

  useEffect(() => {
    const loadSavedLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem('@tracer_alarm_logs');
        if (storedLogs !== null) {
          setLogs(JSON.parse(storedLogs));
        }
      } catch (error) {
        console.error("Failed to load logs from local storage:", error);
      }
    };
    loadSavedLogs();

    const logsRef = ref(db, 'sensor/logs');
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedLogs = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        loadedLogs.sort((a, b) => Number(b.id) - Number(a.id));
        setLogs(loadedLogs);
        AsyncStorage.setItem('@tracer_alarm_logs', JSON.stringify(loadedLogs));
      } else {
        setLogs([]);
        AsyncStorage.removeItem('@tracer_alarm_logs');
      }
    });

    const sensorRef = ref(db, 'sensor/currentPpm');
    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      setLastConnected(`${formattedDate}, ${formattedTime}`);
    });

    return () => {
      unsubscribeLogs();
      unsubscribeSensor();
    };
  }, []);

  const addLog = async (log: AlarmLog) => {
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs);
    
    try {
      await AsyncStorage.setItem('@tracer_alarm_logs', JSON.stringify(updatedLogs));
      await set(ref(db, `sensor/logs/${log.id}`), log);
    } catch (error) {
      console.error("Failed to save log:", error);
    }
  };

  const clearLogs = async () => {
    setLogs([]); 
    try {
      await AsyncStorage.removeItem('@tracer_alarm_logs'); 
      await remove(ref(db, 'sensor/logs')); 
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  const deleteLogs = async (idsToRemove: string[]) => {
    const updatedLogs = logs.filter(log => !idsToRemove.includes(log.id));
    setLogs(updatedLogs); 
    
    try {
      await AsyncStorage.setItem('@tracer_alarm_logs', JSON.stringify(updatedLogs)); 
      
      const updates: { [key: string]: null } = {};
      idsToRemove.forEach(id => {
        updates[id] = null; 
      });
      await update(ref(db, 'sensor/logs'), updates);
    } catch (error) {
      console.error("Failed to delete logs:", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      displayUnit, setDisplayUnit, 
      threshold, setThreshold, 
      soundEnabled, setSoundEnabled,
      vibrationEnabled, setVibrationEnabled,
      logs, addLog, clearLogs, deleteLogs,
      lastConnected 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};