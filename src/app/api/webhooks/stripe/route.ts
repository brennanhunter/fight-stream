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

        // Handle one-time payment checkouts (PPV or VOD)
        if (session.mode === 'payment') {
          if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') break;

          const customerEmail = session.customer_details?.email?.toLowerCase().trim();
          if (!customerEmail) {
            console.error('Webhook: No customer email on payment checkout', session.id);
            break;
          }

          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || session.id;

          // VOD purchases — identified by metadata.purchase_type
          if (session.metadata?.purchase_type === 'vod') {
            // Retrieve line items to get product details
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ['line_items.data.price.product'],
            });
            const lineItem = fullSession.line_items?.data[0];
            const product = lineItem?.price?.product as Stripe.Product | undefined;
            const price = lineItem?.price;

            if (product?.metadata?.s3_key) {
              // Upsert to handle race with save-session
              const { error: upsertError } = await supabase.from('purchases').upsert({
                email: customerEmail,
                purchase_type: 'vod',
                stripe_session_id: session.id,
                stripe_product_id: product.id,
                product_name: product.name,
                product_image: product.images?.[0] || null,
                s3_key: product.metadata.s3_key,
                amount_paid: price?.unit_amount || 0,
                currency: price?.currency || 'usd',
                expires_at: null,
                user_id: session.metadata?.user_id || null,
              }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });

              if (upsertError) {
                console.error('Webhook: VOD purchase save error:', upsertError);
              } else {
                console.log('Webhook: VOD purchase saved for:', customerEmail);
              }
            } else {
              console.error('Webhook: VOD product missing s3_key metadata', session.id);
            }

            break;
          }

          // PPV purchases — everything else
          const metadataEventId = session.metadata?.eventId;
          let targetEvent;

          if (metadataEventId) {
            const { data } = await supabase
              .from('events')
              .select('id, name, expires_at')
              .eq('id', metadataEventId)
              .maybeSingle();
            targetEvent = data;
          }

          if (!targetEvent && !metadataEventId) {
            const { data } = await supabase
              .from('events')
              .select('id, name, expires_at')
              .eq('is_active', true)
              .maybeSingle();
            targetEvent = data;
          }

          if (targetEvent) {
            const expiresAt = targetEvent.expires_at
              ? new Date(targetEvent.expires_at).toISOString()
              : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

            // Upsert to handle race with verify-payment
            const { error: upsertError } = await supabase.from('purchases').upsert({
              email: customerEmail,
              purchase_type: 'ppv',
              stripe_payment_intent_id: paymentIntentId,
              stripe_product_id: null,
              product_name: targetEvent.name,
              event_id: targetEvent.id,
              amount_paid: session.amount_total || 0,
              currency: session.currency || 'usd',
              expires_at: expiresAt,
              user_id: session.metadata?.user_id || null,
            }, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true });

            if (upsertError) {
              console.error('Webhook: PPV purchase save error:', upsertError);
            } else {
              console.log('Webhook: PPV purchase saved for:', customerEmail);
            }
          } else {
            console.error('Webhook: No event found for PPV checkout', session.id);
          }

          break;
        }

        // Handle subscription checkouts
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
