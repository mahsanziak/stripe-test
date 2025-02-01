import { useState, useEffect } from 'react';
import { Elements, useStripe, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getUser } from '../lib/auth';
import Modal from 'react-modal';
import { useRouter } from 'next/router';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Payment Request Form Component
const PaymentRequestForm = () => {
    const stripe = useStripe();
    const [paymentRequest, setPaymentRequest] = useState<ReturnType<Stripe['paymentRequest']> | null>(null);
    const [isLoading, setIsLoading] = useState(false); // Loading state for payment processing
  
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
          setIsLoading(true); // Start loading
          const user = await getUser();
  
          if (!user) {
            toast.error('Please log in to proceed.');
            ev.complete('fail');
            setIsLoading(false); // Stop loading
            return;
          }
  
          try {
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
              toast.error(`Payment failed: ${error}`);
              ev.complete('fail');
            } else {
              toast.success('Payment successful! You now have lifetime access.');
              ev.complete('success');
            }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_) {
    toast.error('An unexpected error occurred. Please try again.');
    ev.complete('fail');
  } finally {
            setIsLoading(false); // Stop loading
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
        {isLoading && <p>Processing payment...</p>} {/* Show loading state */}
      </div>
    );
  };

// Payment Page Component
const PaymentPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const router = useRouter();

  // Redirect unauthenticated users
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getUser();
      if (!user) {
        router.push('/login'); // Redirect to login page
      }
    };
    checkAuth();
  }, [router]);

  return (
    <Elements stripe={stripePromise}>
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <button onClick={openModal}>Open Payment Modal</button>

        <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
          <h2>Pay with Apple Pay or Google Pay</h2>
          <PaymentRequestForm />
          <button onClick={closeModal}>Close Modal</button>
        </Modal>

        {/* Toast notifications */}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </div>
    </Elements>
  );
};

export default PaymentPage;