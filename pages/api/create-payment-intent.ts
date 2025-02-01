import Stripe from 'stripe';
import { getOrCreateStripeCustomer } from '../../lib/stripe';
import { supabase } from '../../lib/supabase';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// Define types for request and response
interface CreatePaymentIntentRequest {
  userId: string;
  email: string;
}
interface CreatePaymentIntentResponse {
  clientSecret: string; // Ensure this is always a string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePaymentIntentResponse | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { userId, email }: CreatePaymentIntentRequest = req.body;

      // Validate request body
      if (!userId || !email) {
        return res.status(400).json({ error: 'Invalid request data' });
      }

      // Check if the user exists in Supabase
      const { data: userExists, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !userExists) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create or retrieve Stripe Customer
      const customerId = await getOrCreateStripeCustomer(userId, email);

      // Create PaymentIntent (without confirming it)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1099, // Amount in cents ($10.99)
        currency: 'usd',
        customer: customerId,
        metadata: {
          supabase_user_id: userId, // Link payment to Supabase user
        },
        automatic_payment_methods: {
          enabled: true, // Enable Automatic Payment Methods
        },
      });

      // Validate client_secret
      if (!paymentIntent.client_secret) {
        return res.status(500).json({ error: 'Failed to generate client secret' });
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