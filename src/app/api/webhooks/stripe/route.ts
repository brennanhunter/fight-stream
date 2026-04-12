import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { stripeServer } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { subscriptionConfirmationEmail } from '@/lib/emails/subscription-confirmation';
import { subscriptionCanceledEmail } from '@/lib/emails/subscription-canceled';
import { paymentFailedEmail } from '@/lib/emails/payment-failed';
import { subscriptionRenewedEmail } from '@/lib/emails/subscription-renewed';
import { purchaseConfirmationEmail } from '@/lib/emails/purchase-confirmation';
import { REPLAY_WINDOW_DAYS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  if (!stripeServer) {
    console.error('Webhook: STRIPE_SECRET_KEY is not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripeServer.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Idempotency: skip events we've already processed
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Mark event as processing (insert early to prevent parallel duplicates)
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type });

  if (insertError) {
    // Unique constraint violation = another function instance is already handling this
    if (insertError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Non-unique error (e.g., Supabase down) — return 500 so Stripe retries later
    // rather than processing without idempotency protection
    console.error('Failed to record stripe event:', insertError);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

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
            let fullSession;
            try {
              fullSession = await stripeServer.checkout.sessions.retrieve(session.id, {
                expand: ['line_items.data.price.product'],
              });
            } catch (stripeErr) {
              console.error('Webhook: Failed to retrieve VOD session line items:', stripeErr);
              break;
            }
            const lineItem = fullSession.line_items?.data[0];
            const product = lineItem?.price?.product as Stripe.Product | undefined;
            const price = lineItem?.price;

            if (product?.metadata?.s3_key) {
              // Upsert to handle race with save-session
              const vodRow = {
                email: customerEmail,
                purchase_type: 'vod' as const,
                stripe_session_id: session.id,
                stripe_payment_intent_id: paymentIntentId,
                stripe_product_id: product.id,
                product_name: product.name,
                product_image: product.images?.[0] || null,
                s3_key: product.metadata.s3_key,
                amount_paid: price?.unit_amount || 0,
                currency: price?.currency || 'usd',
                expires_at: null,
                user_id: session.metadata?.user_id || null,
                session_version: 1,
              };
              const { data: vodPurchase, error: upsertError } = await supabase.from('purchases').upsert(vodRow, { onConflict: 'stripe_session_id' }).select('id').single();

              if (upsertError) {
                console.error('Webhook: VOD purchase save error:', upsertError);
              } else {
                console.log('Webhook: VOD purchase saved for:', customerEmail);
                try {
                  const { html, text } = purchaseConfirmationEmail({
                    eventName: product.name,
                    expiresAt: null,
                    amountPaid: price?.unit_amount || 0,
                    purchaseType: 'vod',
                    vodPurchaseId: vodPurchase?.id,
                  });
                  await resend.emails.send({
                    from: 'BoxStreamTV <hunter@boxstreamtv.com>',
                    replyTo: 'hunter@boxstreamtv.com',
                    to: customerEmail,
                    subject: `Your purchase is confirmed — ${product.name}`,
                    html,
                    text,
                  });
                } catch (emailErr) {
                  console.error('VOD confirmation email failed:', emailErr);
                }
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
              .select('id, name, date')
              .eq('id', metadataEventId)
              .maybeSingle();
            targetEvent = data;
          }

          if (!targetEvent && !metadataEventId) {
            const { data } = await supabase
              .from('events')
              .select('id, name, date')
              .eq('is_active', true)
              .maybeSingle();
            targetEvent = data;
          }

          if (targetEvent) {
            const expiresAt = targetEvent.date
              ? new Date(new Date(targetEvent.date).getTime() + REPLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
              : null;

            // Upsert to handle race with verify-payment
            const ppvRow = {
              email: customerEmail,
              purchase_type: 'ppv' as const,
              stripe_payment_intent_id: paymentIntentId,
              stripe_product_id: null,
              product_name: targetEvent.name,
              event_id: targetEvent.id,
              amount_paid: session.amount_total || 0,
              currency: session.currency || 'usd',
              expires_at: expiresAt,
              user_id: session.metadata?.user_id || null,
              session_version: 1,
            };
            const { error: upsertError } = await supabase.from('purchases').upsert(ppvRow, { onConflict: 'stripe_payment_intent_id' });

            if (upsertError) {
              console.error('Webhook: PPV purchase save error:', upsertError);
            } else {
              console.log('Webhook: PPV purchase saved for:', customerEmail);

              // Send confirmation email if verify-payment hasn't already claimed & emailed.
              // Check session_claimed_at: if null, the user hasn't hit the success page yet.
              const { data: purchase } = await supabase
                .from('purchases')
                .select('session_claimed_at')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .maybeSingle();

              if (!purchase?.session_claimed_at) {
                try {
                  const { html, text } = purchaseConfirmationEmail({
                    eventName: targetEvent.name,
                    expiresAt,
                    amountPaid: session.amount_total || 0,
                  });
                  await resend.emails.send({
                    from: 'BoxStreamTV <hunter@boxstreamtv.com>',
                    replyTo: 'hunter@boxstreamtv.com',
                    to: customerEmail,
                    subject: `You're in — ${targetEvent.name}`,
                    html,
                    text,
                  });
                } catch (emailErr) {
                  console.error('PPV confirmation email failed:', emailErr);
                }
              }
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

        let subscription;
        try {
          subscription = await stripeServer.subscriptions.retrieve(subscriptionId);
        } catch (stripeErr) {
          console.error('Webhook: Failed to retrieve subscription:', stripeErr);
          break;
        }
        const userId = subscription.metadata.user_id || session.metadata?.user_id;

        if (!userId) {
          console.error('No user_id in subscription metadata', subscriptionId);
          break;
        }

        const tier = determineTier(subscription);
        const periods = getPeriodDates(subscription);

        const { error: subUpsertError } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? '',
          stripe_subscription_id: subscriptionId,
          tier,
          status: subscription.status,
          ...periods,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' });

        if (subUpsertError) {
          console.error('Webhook: subscription upsert (checkout) failed:', subUpsertError);
        }

        // Send subscription confirmation email
        const customerEmail = session.customer_details?.email?.toLowerCase().trim();
        if (customerEmail) {
          try {
            const { html, text } = subscriptionConfirmationEmail({
              tier,
              currentPeriodEnd: periods.current_period_end,
            });
            await resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: customerEmail,
              subject: `Welcome to Fight Pass ${tier === 'premium' ? 'Premium' : 'Basic'} — BoxStreamTV`,
              html,
              text,
            });
          } catch (emailErr) {
            console.error('Subscription confirmation email failed:', emailErr);
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const userId = subscription.metadata.user_id;

        const tier = determineTier(subscription);
        const periods = getPeriodDates(subscription);

        // Stripe billing portal may use cancel_at instead of cancel_at_period_end
        const cancelAt = (subscription as Stripe.Subscription & { cancel_at: number | null }).cancel_at;
        const effectivelyCanceling = subscription.cancel_at_period_end || !!cancelAt;

        if (userId) {
          const { error: subUpdateError } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
            stripe_subscription_id: subscription.id,
            tier,
            status: subscription.status,
            ...periods,
            cancel_at_period_end: effectivelyCanceling,
          }, { onConflict: 'stripe_subscription_id' });

          if (subUpdateError) {
            console.error('Webhook: subscription upsert (updated) failed:', subUpdateError);
          }
        } else {
          // No user_id in metadata — update existing row by stripe_subscription_id
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              tier,
              status: subscription.status,
              ...periods,
              cancel_at_period_end: effectivelyCanceling,
            })
            .eq('stripe_subscription_id', subscription.id);

          if (updateError) {
            console.error('Webhook: subscription update (no user_id) failed:', updateError);
          } else {
            console.warn('Webhook: subscription.updated missing user_id metadata, updated by stripe_subscription_id for', subscription.id);
          }
        }

        // Send cancellation email when subscription is scheduled to cancel
        // Stripe billing portal may use cancel_at_period_end OR cancel_at (a specific timestamp)
        const justCanceled =
          // Method 1: cancel_at_period_end flipped to true
          (subscription.cancel_at_period_end && previousAttributes?.cancel_at_period_end === false) ||
          // Method 2: cancel_at was just set (cancellation_details changed)
          (cancelAt && !subscription.cancel_at_period_end &&
            previousAttributes?.cancellation_details !== undefined);

        if (justCanceled) {
          const accessUntil = cancelAt
            ? new Date(cancelAt * 1000).toISOString()
            : periods.current_period_end;
          try {
            const customerEmail = await getEmailForCustomer(subscription.customer);
            if (customerEmail) {
              const { html, text } = subscriptionCanceledEmail({
                tier,
                accessUntil,
              });
              await resend.emails.send({
                from: 'BoxStreamTV <hunter@boxstreamtv.com>',
                replyTo: 'hunter@boxstreamtv.com',
                to: customerEmail,
                subject: 'Your Fight Pass has been canceled',
                html,
                text,
              });
            }
          } catch (emailErr) {
            console.error('Cancellation email failed:', emailErr);
          }
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: deleteUpdateError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: false })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteUpdateError) {
          console.error('Webhook: subscription update (deleted) failed:', deleteUpdateError);
        }

        // Send cancellation confirmation email
        try {
          const customerEmail = await getEmailForCustomer(subscription.customer);
          if (customerEmail) {
            const tier = determineTier(subscription);
            const periods = getPeriodDates(subscription);
            const { html, text } = subscriptionCanceledEmail({
              tier,
              accessUntil: periods.current_period_end,
            });
            await resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: customerEmail,
              subject: 'Your Fight Pass has been canceled',
              html,
              text,
            });
          }
        } catch (emailErr) {
          console.error('Cancellation email failed:', emailErr);
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Only send on renewals, not the initial subscription payment
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId = subDetails
          ? (typeof subDetails.subscription === 'string'
              ? subDetails.subscription
              : subDetails.subscription?.id)
          : null;

        if (!subscriptionId) break;

        try {
          const customerEmail = invoice.customer_email
            ?? (invoice.customer ? await getEmailForCustomer(invoice.customer) : null);
          if (customerEmail) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('tier, current_period_end')
              .eq('stripe_subscription_id', subscriptionId)
              .maybeSingle();

            const tier = (sub?.tier as 'basic' | 'premium') ?? 'basic';
            const amountPaid = invoice.amount_paid
              ? `$${(invoice.amount_paid / 100).toFixed(2)}`
              : 'N/A';

            const { html, text } = subscriptionRenewedEmail({
              tier,
              amountPaid,
              nextRenewal: sub?.current_period_end ?? null,
            });
            await resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: customerEmail,
              subject: `Fight Pass ${tier === 'premium' ? 'Premium' : 'Basic'} renewed — BoxStreamTV`,
              html,
              text,
            });
          }
        } catch (emailErr) {
          console.error('Renewal email failed:', emailErr);
        }

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
          const { error: pastDueError } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          if (pastDueError) {
            console.error('Webhook: subscription update (past_due) failed:', pastDueError);
          }

          // Send payment failed email
          try {
            const customerEmail = invoice.customer_email
              ?? (invoice.customer ? await getEmailForCustomer(invoice.customer) : null);
            if (customerEmail) {
              const { data: sub } = await supabase
                .from('subscriptions')
                .select('tier')
                .eq('stripe_subscription_id', subscriptionId)
                .maybeSingle();

              const tier = (sub?.tier as 'basic' | 'premium') ?? 'basic';
              const nextRetry = invoice.next_payment_attempt
                ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                : null;

              const { html, text } = paymentFailedEmail({ tier, nextRetryDate: nextRetry });
              await resend.emails.send({
                from: 'BoxStreamTV <hunter@boxstreamtv.com>',
                replyTo: 'hunter@boxstreamtv.com',
                to: customerEmail,
                subject: 'Action required — payment failed for your Fight Pass',
                html,
                text,
              });
            }
          } catch (emailErr) {
            console.error('Payment failed email error:', emailErr);
          }
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

        if (!paymentIntentId) {
          console.error('Webhook: charge.refunded missing payment_intent', charge.id);
          break;
        }

        // Revoke access: set expires_at to now. check-purchase validates expires_at
        // from the DB, so any active JWT session is denied on the next access check.
        const { data: updated, error: refundError } = await supabase
          .from('purchases')
          .update({
            expires_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select('id, email, product_name');

        if (refundError) {
          console.error('Webhook: refund update error:', refundError);
        } else if (updated?.length) {
          console.log(`Webhook: Refund processed — revoked access for ${updated.length} purchase(s) on PI ${paymentIntentId}`);
        } else {
          // Fallback: older VOD purchases may not have stripe_payment_intent_id set.
          // Try to find them via the Stripe checkout session linked to this payment intent.
          try {
            const sessions = await stripeServer.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
            const checkoutSessionId = sessions.data[0]?.id;
            if (checkoutSessionId) {
              const { data: vodUpdated, error: vodRefundError } = await supabase
                .from('purchases')
                .update({ expires_at: new Date().toISOString() })
                .eq('stripe_session_id', checkoutSessionId)
                .select('id, email, product_name');

              if (vodRefundError) {
                console.error('Webhook: VOD refund fallback error:', vodRefundError);
              } else if (vodUpdated?.length) {
                console.log(`Webhook: Refund (VOD fallback) — revoked access for ${vodUpdated.length} purchase(s) via session ${checkoutSessionId}`);
              } else {
                console.warn(`Webhook: charge.refunded but no matching purchase for PI ${paymentIntentId} or session ${checkoutSessionId}`);
              }
            } else {
              console.warn(`Webhook: charge.refunded but no matching purchase for PI ${paymentIntentId}`);
            }
          } catch (fallbackErr) {
            console.error('Webhook: refund VOD fallback lookup failed:', fallbackErr);
          }
        }

        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = typeof dispute.charge === 'string'
          ? null
          : dispute.charge;
        const paymentIntentId = dispute.payment_intent
          ? (typeof dispute.payment_intent === 'string'
            ? dispute.payment_intent
            : dispute.payment_intent.id)
          : (charge?.payment_intent
            ? (typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : charge.payment_intent?.id)
            : null);

        if (!paymentIntentId) {
          console.error('Webhook: charge.dispute.created missing payment_intent', dispute.id);
          break;
        }

        // Revoke access on dispute — same pattern as charge.refunded.
        // If the dispute is later resolved in the merchant's favor, access
        // can be re-granted manually via the admin grant tool.
        const { data: disputed, error: disputeError } = await supabase
          .from('purchases')
          .update({
            expires_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select('id, email, product_name');

        if (disputeError) {
          console.error('Webhook: dispute update error:', disputeError);
        } else if (disputed?.length) {
          console.log(`Webhook: Dispute — revoked access for ${disputed.length} purchase(s) on PI ${paymentIntentId} (reason: ${dispute.reason})`);
        } else {
          // Fallback: legacy VOD rows may lack stripe_payment_intent_id.
          // Look up the checkout session that used this payment_intent, then match by session ID.
          try {
            const sessions = await stripeServer!.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1,
            });
            const checkoutSessionId = sessions.data[0]?.id;
            if (checkoutSessionId) {
              const { data: legacy, error: legacyErr } = await supabase
                .from('purchases')
                .update({ expires_at: new Date().toISOString() })
                .eq('stripe_session_id', checkoutSessionId)
                .select('id, email, product_name');
              if (legacyErr) {
                console.error('Webhook: dispute VOD fallback update error:', legacyErr);
              } else if (legacy?.length) {
                console.log(`Webhook: Dispute fallback — revoked ${legacy.length} purchase(s) via session ${checkoutSessionId} (reason: ${dispute.reason})`);
              } else {
                console.warn(`Webhook: charge.dispute.created but no matching purchase for PI ${paymentIntentId} or session ${checkoutSessionId}`);
              }
            } else {
              console.warn(`Webhook: charge.dispute.created but no matching purchase for PI ${paymentIntentId}`);
            }
          } catch (fallbackErr) {
            console.error('Webhook: dispute VOD fallback lookup failed:', fallbackErr);
          }
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

/** Fetch customer email from Stripe given a customer ID or object */
async function getEmailForCustomer(customer: Stripe.Subscription['customer']): Promise<string | null> {
  try {
    const customerId = typeof customer === 'string' ? customer : customer.id;
    const retrieved = await stripeServer!.customers.retrieve(customerId);
    if (retrieved.deleted) return null;
    return retrieved.email ?? null;
  } catch {
    return null;
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
