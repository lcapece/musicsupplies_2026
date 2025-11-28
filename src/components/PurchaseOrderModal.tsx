import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      // Immediately navigate to the Purchase Orders page
      navigate('/purchase-orders');
      onClose();
    }
  }, [isOpen, navigate, onClose]);

  return null;
};

export default PurchaseOrderModal;
