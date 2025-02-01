import { useState, useEffect } from 'react';import {
  Elements,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
  CardElement,
} from '@stripe/react-stripe-js';
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
  const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true);
        const user = await getUser();

        if (!user) {
          toast.error('Please log in to proceed.');
          ev.complete('fail');
          setIsLoading(false);
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
        } catch {
          toast.error('An unexpected error occurred. Please try again.');
          ev.complete('fail');
        } finally {
          setIsLoading(false);
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
      {isLoading && <p>Processing payment...</p>}
    </div>
  );
};

const CreditCardForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    const user = await getUser();

    if (!user) {
      toast.error('Please log in to proceed.');
      setIsLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      toast.error('Card element not found.');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch the client secret from the backend
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const { clientSecret } = await response.json();

      if (!clientSecret) {
        throw new Error('Failed to create PaymentIntent');
      }

      // Confirm the payment on the client side
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user.email,
          },
        },
      });

      if (error) {
        toast.error(`Payment failed: ${error.message}`);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful! You now have lifetime access.');
        router.push('/success'); // Redirect to success page
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Pay with Card'}
      </button>
    </form>
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

          <h3>Or Pay with Card</h3>
          <CreditCardForm />

          <button onClick={closeModal}>Close Modal</button>
        </Modal>

        {/* Toast notifications */}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </div>
    </Elements>
  );
};

export default PaymentPage;