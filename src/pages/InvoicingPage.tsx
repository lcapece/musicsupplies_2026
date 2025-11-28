import React from 'react';
import InvoiceModal from '../components/InvoiceModal';

/**
 * InvoicingPage - Full page wrapper for the Invoice Modal
 *
 * This page displays the modern InvoiceModal component as a full-screen
 * invoicing interface for staff users. The modal is always open when
 * on this page, providing a seamless invoicing experience.
 */
export default function InvoicingPage() {
  // The modal is always open when on this page
  // Closing navigates back to the previous page
  const handleClose = () => {
    window.history.back();
  };

  return (
    <InvoiceModal
      isOpen={true}
      onClose={handleClose}
    />
  );
}
