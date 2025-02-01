import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';

// Load Stripe instance
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

// Payment Request Button Component
const PaymentRequestForm = () => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);

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
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Pay with Apple Pay or Google Pay</h1>
      {paymentRequest ? (
        <PaymentRequestButtonElement options={{ paymentRequest }} />
      ) : (
        <p>Apple Pay / Google Pay not available.</p>
      )}
    </div>
  );
};

// Main Payment Page
const PaymentPage = () => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentRequestForm />
    </Elements>
  );
};

export default PaymentPage;