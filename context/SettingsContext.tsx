import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

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
  setThreshold: (val: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (val: boolean) => void;
  logs: AlarmLog[];
  addLog: (log: AlarmLog) => void;
  clearLogs: () => void; 
  deleteLogs: (ids: string[]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('ppm');
  const [threshold, setThreshold] = useState('2000'); 
  const [soundEnabled, setSoundEnabled] = useState(true); 
  const [vibrationEnabled, setVibrationEnabled] = useState(true); 
  
  const [logs, setLogs] = useState<AlarmLog[]>([]);

  // NEW: 1. Load the logs from the phone's storage the moment the app opens
  useEffect(() => {
    const loadSavedLogs = async () => {
      try {
        const storedLogs = await AsyncStorage.getItem('@tracer_alarm_logs');
        if (storedLogs !== null) {
          // If we found saved logs, parse the JSON and put it into our state
          setLogs(JSON.parse(storedLogs));
        }
      } catch (error) {
        console.error("Failed to load logs from storage:", error);
      }
    };
    
    loadSavedLogs();
  }, []);

  // NEW: 2. Update addLog to save to storage
  const addLog = async (log: AlarmLog) => {
    const updatedLogs = [log, ...logs];
    setLogs(updatedLogs); // Update the UI instantly
    
    // Save the new array silently in the background
    try {
      await AsyncStorage.setItem('@tracer_alarm_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error("Failed to save log to storage:", error);
    }
  };

  // NEW: 3. Update clearLogs to wipe the storage
  const clearLogs = async () => {
    setLogs([]); // Clear UI
    try {
      await AsyncStorage.removeItem('@tracer_alarm_logs'); // Clear hard drive
    } catch (error) {
      console.error("Failed to clear storage:", error);
    }
  };

  // NEW: 4. Update deleteLogs to save the filtered array to storage
  const deleteLogs = async (idsToRemove: string[]) => {
    const updatedLogs = logs.filter(log => !idsToRemove.includes(log.id));
    setLogs(updatedLogs); // Update UI
    
    try {
      await AsyncStorage.setItem('@tracer_alarm_logs', JSON.stringify(updatedLogs)); // Update hard drive
    } catch (error) {
      console.error("Failed to update storage after deletion:", error);
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      displayUnit, setDisplayUnit, 
      threshold, setThreshold,
      soundEnabled, setSoundEnabled,
      vibrationEnabled, setVibrationEnabled,
      logs, addLog, clearLogs, deleteLogs 
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