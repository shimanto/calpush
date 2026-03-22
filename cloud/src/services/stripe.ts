import Stripe from 'stripe';
import { env } from '../lib/env.js';
import { db } from '../lib/db.js';

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// --- Customer Management ---

async function getOrCreateCustomer(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { calpushUserId: userId },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// --- Checkout Session ---

export async function createCheckoutSession(userId: string, plan: 'pro' | 'business'): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(userId);

  const priceId = plan === 'pro' ? env.STRIPE_PRO_PRICE_ID : env.STRIPE_BUSINESS_PRICE_ID;
  if (!priceId) throw new Error(`Price ID not configured for ${plan} plan`);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.BASE_URL}/dashboard?upgraded=true`,
    cancel_url: `${env.BASE_URL}/dashboard?cancelled=true`,
    metadata: { calpushUserId: userId, plan },
  });

  return session.url!;
}

// --- Customer Portal ---

export async function createPortalSession(userId: string): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.BASE_URL}/dashboard`,
  });

  return session.url;
}

// --- Webhook Handler ---

export async function handleWebhookEvent(rawBody: string, signature: string) {
  const stripe = getStripe();

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.calpushUserId;
      const plan = session.metadata?.plan;
      if (!userId || !plan) break;

      await db.user.update({
        where: { id: userId },
        data: {
          plan,
          stripeSubId: typeof session.subscription === 'string' ? session.subscription : null,
          stripeSubStatus: 'active',
        },
      });
      console.log(`[stripe] user=${userId} upgraded to ${plan}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const user = await db.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
      if (!user) break;

      const status = sub.status;
      const plan = status === 'active' || status === 'trialing'
        ? user.plan
        : 'free';

      await db.user.update({
        where: { id: user.id },
        data: {
          stripeSubStatus: status,
          plan: status === 'active' || status === 'trialing' ? user.plan : 'free',
          planExpiresAt: sub.items?.data?.[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000)
            : null,
        },
      });
      console.log(`[stripe] subscription updated user=${user.id} status=${status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const user = await db.user.findFirst({ where: { stripeCustomerId: sub.customer as string } });
      if (!user) break;

      await db.user.update({
        where: { id: user.id },
        data: {
          plan: 'free',
          stripeSubStatus: 'canceled',
          stripeSubId: null,
          planExpiresAt: null,
        },
      });
      console.log(`[stripe] subscription canceled user=${user.id}, downgraded to free`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const user = await db.user.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
      if (!user) break;

      await db.user.update({
        where: { id: user.id },
        data: { stripeSubStatus: 'past_due' },
      });
      console.log(`[stripe] payment failed user=${user.id}`);
      break;
    }
  }
}
