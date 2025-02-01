// lib/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export const getOrCreateStripeCustomer = async (userId: string, email: string) => {
  const customer = await stripe.customers.list({ email });

  if (customer.data.length > 0) {
    // Customer already exists
    return customer.data[0].id;
  } else {
    // Create a new customer
    const newCustomer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId }, // Link to Supabase user
    });
    return newCustomer.id;
  }
};