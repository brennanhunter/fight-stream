'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  cancelSubscriptionNow,
  resumeSubscription,
  scheduleSubscriptionCancellation,
} from '../actions';

type Props = {
  subscriptionId: string;
  email: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
};

export default function SubscriberRowActions({
  subscriptionId,
  email,
  status,
  cancelAtPeriodEnd,
  stripeSubscriptionId,
  stripeCustomerId,
}: Props) {
  const [pending, startTransition] = useTransition();

  function handleCopyEmail() {
    navigator.clipboard.writeText(email);
    toast.success('Copied email', { description: email });
  }

  function handleScheduleCancel() {
    if (!confirm(`Cancel ${email}'s Fight Pass at the end of the current period?\n\nAccess continues until the period ends. They won't be charged again.`)) {
      return;
    }
    startTransition(async () => {
      const res = await scheduleSubscriptionCancellation(subscriptionId);
      if (res.ok) toast.success('Cancellation scheduled', { description: email });
      else toast.error('Failed', { description: res.error });
    });
  }

  function handleResume() {
    startTransition(async () => {
      const res = await resumeSubscription(subscriptionId);
      if (res.ok) toast.success('Resumed', { description: email });
      else toast.error('Failed', { description: res.error });
    });
  }

  function handleCancelNow() {
    if (!confirm(`CANCEL ${email}'s Fight Pass IMMEDIATELY?\n\nAccess will be revoked right now. Stripe won't bill again. This is rarely the right choice — usually you want "Cancel at period end".`)) {
      return;
    }
    startTransition(async () => {
      const res = await cancelSubscriptionNow(subscriptionId);
      if (res.ok) toast.success('Subscription canceled', { description: email });
      else toast.error('Failed', { description: res.error });
    });
  }

  const stripeUrl = stripeSubscriptionId
    ? `https://dashboard.stripe.com/subscriptions/${stripeSubscriptionId}`
    : stripeCustomerId
      ? `https://dashboard.stripe.com/customers/${stripeCustomerId}`
      : null;

  const isCanceled = status === 'canceled';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark bg-popover text-popover-foreground">
        <DropdownMenuItem onClick={handleCopyEmail}>Copy email</DropdownMenuItem>
        {stripeUrl && (
          <DropdownMenuItem onClick={() => window.open(stripeUrl, '_blank', 'noopener,noreferrer')}>
            View in Stripe
          </DropdownMenuItem>
        )}
        {email && (
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(email);
              toast.info('Email copied — paste into Resend’s search', { description: email });
              window.open('https://resend.com/emails', '_blank', 'noopener,noreferrer');
            }}
          >
            View in Resend
          </DropdownMenuItem>
        )}
        {!isCanceled && (
          <>
            <DropdownMenuSeparator />
            {cancelAtPeriodEnd ? (
              <DropdownMenuItem onClick={handleResume}>Resume (undo cancellation)</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleScheduleCancel}>Cancel at period end</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCancelNow} variant="destructive">
              Cancel immediately
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
