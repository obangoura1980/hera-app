import React from 'react';
import { Modal } from 'react-native';
import { RevenueCatPaywall } from '@/components/feature/RevenueCatPaywall';

interface PaywallModalProps {
  visible: boolean;
  feature?: string;
  chatCount?: number;
  chatLimit?: number;
  onClose: () => void;
  onCheckout?: () => void;
  onViewPlans?: () => void;
}

export function PaywallModal({
  visible,
  onClose,
}: PaywallModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <RevenueCatPaywall
        onDismiss={onClose}
        onPurchaseSuccess={onClose}
      />
    </Modal>
  );
}
