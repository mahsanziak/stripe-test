import { useState, useEffect } from 'react'; // Import useEffect
import { Elements, useStripe, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js'; // Import Stripe for type definitions
import { getUser } from '../lib/auth';
import Modal from 'react-modal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PaymentRequestForm = () => {
  const stripe = useStripe();

  // Use the correct type for paymentRequest
  const [paymentRequest, setPaymentRequest] = useState<ReturnType<Stripe['paymentRequest']> | null>(null);

  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Lifetime Access',
          amount: 1099, // $10.99
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      pr.canMakePayment().then((result) => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      pr.on('paymentmethod', async (ev) => {
        const user = await getUser();
        if (!user) {
          alert('Please log in to proceed.');
          ev.complete('fail');
          return;
        }

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: ev.paymentMethod.id,
            userId: user.id,
            email: user.email,
          }),
        });

        const { error } = await response.json();

        if (error) {
          ev.complete('fail');
        } else {
          ev.complete('success');
          alert('Payment successful! You now have lifetime access.');
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

const PaymentPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <Elements stripe={stripePromise}>
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button onClick={openModal}>Open Payment Modal</button>

        <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
          <h2>Pay with Apple Pay or Google Pay</h2>
          <PaymentRequestForm />
          <button onClick={closeModal}>Close Modal</button>
        </Modal>
      </div>
    </Elements>
  );
};

export default PaymentPage;