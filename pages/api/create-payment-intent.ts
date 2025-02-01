// pages/api/create-payment-intent.ts
import Stripe from 'stripe';
import { getOrCreateStripeCustomer } from '../../lib/stripe';
import { supabase } from '../../lib/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// Define types for request and response
interface CreatePaymentIntentRequest {
  paymentMethodId: string;
  userId: string;
  email: string;
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePaymentIntentResponse | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { paymentMethodId, userId, email }: CreatePaymentIntentRequest = req.body;

      // Create or retrieve Stripe Customer
      const customerId = await getOrCreateStripeCustomer(userId, email);

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1099, // Amount in cents ($10.99)
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          supabase_user_id: userId, // Link payment to Supabase user
        },
      });

      // Ensure client_secret is not null
      if (!paymentIntent.client_secret) {
        return res.status(500).json({ error: 'Failed to create PaymentIntent' });
      }

      // Update Supabase database
      const { error } = await supabase
        .from('users')
        .update({ has_lifetime_access: true })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user access:', error);
        return res.status(500).json({ error: 'Failed to update user access' });
      }

      // Send the client secret in the response
      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      // Use Stripe's error type
      const stripeError = error as Stripe.errors.StripeError;
      res.status(400).json({ error: stripeError.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}