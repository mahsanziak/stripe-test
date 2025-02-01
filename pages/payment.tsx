import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, useStripe, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import Modal from 'react-modal';

// Load Stripe instance
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

// Custom Modal Styles
const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: '20px',
    maxWidth: '400px',
    border: '1px solid #ccc',
    borderRadius: '8px',
  },
};

// Payment Request Button Component
const PaymentRequestForm = () => {
  const stripe = useStripe();

  // Define the correct type for paymentRequest
  const [paymentRequest, setPaymentRequest] =
    useState<ReturnType<Stripe['paymentRequest']> | null>(null);

  useEffect(() => {
    if (stripe) {
      // Create PaymentRequest object
      const pr = stripe.paymentRequest({
        country: 'US', // Change to your country code
        currency: 'usd',
        total: {
          label: 'Demo Payment',
          amount: 1099, // Amount in cents ($10.99)
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Check if PaymentRequest is supported (Apple Pay/Google Pay)
      pr.canMakePayment().then((result) => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      // Handle payment events
      pr.on('paymentmethod', async (ev) => {
        // Send payment method to your server to complete the charge
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: ev.paymentMethod.id }),
        });

        const { error } = await response.json();

        if (error) {
          // Show error to your customer
          ev.complete('fail');
        } else {
          // Payment successful
          ev.complete('success');
        }
      });
    }
  }, [stripe]);

  return (
    <div>
      {paymentRequest ? (
        <PaymentRequestButtonElement options={{ paymentRequest }} />
      ) : (
        <p>Apple Pay / Google Pay not available.</p>
      )}
    </div>
  );
};

// Main Payment Page with Modal
const PaymentPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <Elements stripe={stripePromise}>
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button onClick={openModal} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Open Payment Modal
        </button>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onRequestClose={closeModal}
          style={customModalStyles}
          contentLabel="Payment Modal"
        >
          <h2 style={{ marginBottom: '20px' }}>Pay with Apple Pay or Google Pay</h2>
          <PaymentRequestForm />
          <button
            onClick={closeModal}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '16px',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Close Modal
          </button>
        </Modal>
      </div>
    </Elements>
  );
};

export default PaymentPage;