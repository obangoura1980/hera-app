// @ts-nocheck
/**
 * AlertProvider — app-wide themed alert modal (replaces the native Android/iOS
 * system dialogs). Same showAlert(title, message, buttons) API everywhere.
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { AlertButton, AlertState } from './types';
import { useTheme } from '@/hooks/useTheme';

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({ visible: false, title: '', message: '', buttons: [] });

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertState({
      visible: true,
      title,
      message: message || '',
      buttons: buttons?.length ? buttons : [{ text: 'OK', onPress: () => {} }],
    });
  }, []);

  const hideAlert = useCallback(() => setAlertState(prev => ({ ...prev, visible: false })), []);

  const handleButtonPress = useCallback((button: AlertButton) => {
    hideAlert();
    try {
      if (typeof button.onPress === 'function') button.onPress();
    } catch (error) {
      console.warn('[AlertProvider] Button press error:', error);
    }
  }, [hideAlert]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <ThemedAlertModal alertState={alertState} onButtonPress={handleButtonPress} onHide={hideAlert} />
    </AlertContext.Provider>
  );
}

export function useAlertContext(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) throw new Error('useAlertContext must be used within an AlertProvider');
  return context;
}

function ThemedAlertModal({ alertState, onButtonPress, onHide }: {
  alertState: AlertState; onButtonPress: (b: AlertButton) => void; onHide: () => void;
}) {
  const { colors: c, isDark } = useTheme();
  if (!alertState.visible) return null;

  const cancelBtn = alertState.buttons.find(b => b.style === 'cancel');
  const stacked = alertState.buttons.length > 2;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => (cancelBtn ? onButtonPress(cancelBtn) : onHide())}>
      <View style={st.overlay}>
        <View style={[st.card, { backgroundColor: isDark ? '#12142A' : '#FFFFFF', borderColor: c.border }]}>
          <Text style={[st.title, { color: c.textWhite }]}>{alertState.title}</Text>
          {alertState.message ? <Text style={[st.message, { color: c.textMuted }]}>{alertState.message}</Text> : null}
          <View style={[st.actions, stacked && { flexDirection: 'column' }]}>
            {alertState.buttons.map((b, i) => {
              const destructive = b.style === 'destructive';
              const cancel = b.style === 'cancel';
              const primary = !cancel && !destructive;
              return (
                <Pressable
                  key={i}
                  onPress={() => onButtonPress(b)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    st.btn,
                    !stacked && { flex: 1 },
                    cancel && { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.border },
                    primary && { backgroundColor: c.primary },
                    destructive && { backgroundColor: c.error },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[st.btnTxt, { color: cancel ? c.textWhite : '#FFFFFF' }]}>{b.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnTxt: { fontSize: 15, fontWeight: '700' },
});
