import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, AlarmLog } from '../../context/SettingsContext';

export default function History() {
  const { displayUnit, logs, deleteLogs } = useSettings();
  
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest'>('newest');
  
  // State variables for Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSort = () => {
    if (sortOrder === 'newest') setSortOrder('oldest');
    else if (sortOrder === 'oldest') setSortOrder('highest');
    else setSortOrder('newest');
  };

  // Enters selection mode when the main "Delete" button is tapped
  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedIds([]);
  };

  // Exits selection mode and clears any checked boxes
  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  // Toggles the "Select All" state
  const handleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      // If everything is selected, deselect all
      setSelectedIds([]);
    } else {
      // Otherwise, select every single log's ID
      setSelectedIds(logs.map(log => log.id));
    }
  };

  // Toggles a single item's checkbox when tapped
  const handlePressItem = (id: string) => {
    if (!isSelectionMode) return; // Do nothing if not in edit mode

    if (selectedIds.includes(id)) {
      // Remove from selection
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      // Add to selection
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Safely deletes only the selected logs
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      "Delete Alarms",
      `Are you sure you want to delete ${selectedIds.length} alarm(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            deleteLogs(selectedIds);
            cancelSelection();
          } 
        }
      ]
    );
  };

  const getSortedLogs = () => {
    const sorted = [...logs];
    if (sortOrder === 'highest') return sorted.sort((a, b) => b.peak - a.peak);
    if (sortOrder === 'oldest') return sorted.reverse(); 
    return sorted; 
  };

  const renderLogItem = ({ item }: { item: AlarmLog }) => {
    const displayPeak = displayUnit === 'ppm' ? item.peak : parseFloat((item.peak / 210).toFixed(1));
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity 
        activeOpacity={isSelectionMode ? 0.7 : 1} 
        onPress={() => handlePressItem(item.id)}
        // If in selection mode, disable the normal visual tap effect unless it's selected
        style={[styles.logCard, isSelected && styles.logCardSelected]}
      >
        {/* The Checkbox: Only shows up when in selection mode */}
        {isSelectionMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons 
              name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
              size={24} 
              color={isSelected ? "#F44336" : "#ccc"} 
            />
          </View>
        )}

        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={24} color="#F44336" />
        </View>
        
        <View style={styles.logDetails}>
          <Text style={styles.logDate}>{item.date}</Text>
          <Text style={styles.logTime}>Triggered at {item.time}</Text>
        </View>

        <View style={styles.logData}>
          <Text style={styles.peakText}>Peak</Text>
          <Text style={styles.peakValue}>{displayPeak} {displayUnit}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>Alarm History</Text>
      </View>

      {logs.length > 0 && (
        <View style={styles.actionBar}>
          {isSelectionMode ? (
            // --- UI DURING SELECTION MODE ---
            <>
              <TouchableOpacity style={styles.actionButton} onPress={cancelSelection}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleSelectAll}>
                <Ionicons name="checkmark-done-outline" size={16} color="#444" style={{ marginRight: 6 }} />
                <Text style={styles.actionText}>
                  {selectedIds.length === logs.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton, selectedIds.length === 0 && { opacity: 0.5 }]} 
                onPress={handleDeleteSelected}
                disabled={selectedIds.length === 0}
              >
                <Ionicons name="trash-outline" size={16} color={selectedIds.length > 0 ? "#F44336" : "#999"} style={{ marginRight: 4 }} />
                <Text style={[styles.deleteText, selectedIds.length === 0 && { color: "#999" }]}>
                  ({selectedIds.length})
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // --- UI DURING NORMAL MODE ---
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleToggleSort}>
                <Ionicons name="swap-vertical" size={16} color="#444" style={{ marginRight: 6 }} />
                <Text style={styles.actionText}>
                  Sort: {sortOrder === 'newest' ? 'Newest First' : sortOrder === 'oldest' ? 'Oldest First' : 'Highest Peak'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={enterSelectionMode}>
                <Ionicons name="trash-outline" size={16} color="#F44336" style={{ marginRight: 6 }} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No alarms recorded.</Text>
          <Text style={styles.emptyStateSubtext}>Your environment has been safe.</Text>
        </View>
      ) : (
        <FlatList
          data={getSortedLogs()}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  topBar: { alignItems: 'center', paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  appTitle: { fontSize: 18, fontWeight: '600' },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6F8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  deleteButton: { backgroundColor: '#FFEBEE' },
  actionText: { fontSize: 13, fontWeight: '500', color: '#444' },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#F44336' },
  listContent: { padding: 20, paddingBottom: 40 },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  
  // Highlight style when a card is checked
  logCardSelected: { backgroundColor: '#FFEBEE', borderColor: '#F44336', borderWidth: 1 },
  checkboxContainer: { marginRight: 15, justifyContent: 'center' },
  
  iconContainer: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFEBEE', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  logDetails: { flex: 1 },
  logDate: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 4 },
  logTime: { fontSize: 13, color: '#888' },
  logData: { alignItems: 'flex-end' },
  peakText: { fontSize: 12, color: '#888', marginBottom: 2 },
  peakValue: { fontSize: 15, fontWeight: 'bold', color: '#F44336' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 15 },
  emptyStateSubtext: { fontSize: 14, color: '#999', marginTop: 5 }
});