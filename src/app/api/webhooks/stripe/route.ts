import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle subscription checkouts
        if (session.mode !== 'subscription' || !session.subscription) break;

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata.user_id || session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata', subscriptionId);
          break;
        }

        const tier = determineTier(subscription);
        const periods = getPeriodDates(subscription);

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? '',
          stripe_subscription_id: subscriptionId,
          tier,
          status: subscription.status,
          ...periods,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;

        if (!userId) break;

        const tier = determineTier(subscription);
        const periods = getPeriodDates(subscription);

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          tier,
          status: subscription.status,
          ...periods,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId = subDetails
          ? (typeof subDetails.subscription === 'string'
              ? subDetails.subscription
              : subDetails.subscription?.id)
          : null;

        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/** Determine tier from Stripe subscription price metadata */
function determineTier(subscription: Stripe.Subscription): 'basic' | 'premium' {
  const item = subscription.items.data[0];
  const tierMeta = item?.price?.metadata?.tier || item?.plan?.metadata?.tier;
  if (tierMeta === 'premium') return 'premium';
  return 'basic';
}

/** Extract period dates from subscription items (Stripe v19 moved these off the subscription object) */
function getPeriodDates(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    current_period_start: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    current_period_end: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
  };
}
