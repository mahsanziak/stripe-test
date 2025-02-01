import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { paymentMethodId } = req.body;

      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1099, // Amount in cents ($10.99)
        currency: 'usd',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
      });

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