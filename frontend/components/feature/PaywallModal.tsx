import React from 'react';
import { Modal } from 'react-native';
import { RevenueCatPaywall } from '@/components/feature/RevenueCatPaywall';

interface PaywallModalProps {
  visible: boolean;
  feature?: string;
  offeringId?: string;
  chatCount?: number;
  chatLimit?: number;
  onClose: () => void;
  onCheckout?: () => void;
  onViewPlans?: () => void;
}

export function PaywallModal({
  visible,
  offeringId = 'default',
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
        offeringId={offeringId}
        onDismiss={onClose}
        onPurchaseSuccess={onClose}
      />
    </Modal>
  );
}
