import { Stack } from 'expo-router';
import { SettingsProvider } from '../context/SettingsContext';
import * as Updates from 'expo-updates'; // NEW: Import the Updates API
import { useEffect } from 'react';

export default function RootLayout() {

  // NEW: The Silent Background Updater
  useEffect(() => {
    async function silentlyCheckForUpdates() {
      try {
        // 1. Ask the Expo server if there is new code
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          // 2. If yes, silently download it in the background
          await Updates.fetchUpdateAsync();
          // 3. Instantly reboot the app to apply the new UI
          await Updates.reloadAsync();
        }
      } catch (error) {
        // If it fails (e.g., no internet), it just ignores it and loads the app normally!
        console.log("Silent update check failed or no internet:", error);
      }
    }

    // Run this function exactly once when the app opens
    silentlyCheckForUpdates();
  }, []);

  return (
    <SettingsProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SettingsProvider>
  );
}