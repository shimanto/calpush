import { Hono } from 'hono';
import { requireAuth } from '../middleware/session.js';
import { createCheckoutSession, createPortalSession, handleWebhookEvent } from '../services/stripe.js';
import { env } from '../lib/env.js';
import type { AppVariables } from '../lib/types.js';

const stripe = new Hono<{ Variables: AppVariables }>();

// --- Checkout (requires auth) ---

stripe.post('/checkout', requireAuth, async (c) => {
  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }

  const userId = c.get('userId') as string;
  const { plan } = await c.req.json<{ plan: 'pro' | 'business' }>();

  if (plan !== 'pro' && plan !== 'business') {
    return c.json({ error: 'Invalid plan. Must be "pro" or "business"' }, 400);
  }

  const url = await createCheckoutSession(userId, plan);
  return c.json({ url });
});

// --- Customer Portal (requires auth) ---

stripe.post('/portal', requireAuth, async (c) => {
  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: 'Billing is not configured' }, 503);
  }

  const userId = c.get('userId') as string;
  const url = await createPortalSession(userId);
  return c.json({ url });
});

// --- Webhook (no auth, verified by Stripe signature) ---

stripe.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }

  const rawBody = await c.req.text();

  try {
    await handleWebhookEvent(rawBody, signature);
    return c.json({ received: true });
  } catch (err: any) {
    console.error('[stripe webhook] error:', err.message);
    return c.json({ error: 'Webhook processing failed' }, 400);
  }
});

export default stripe;
