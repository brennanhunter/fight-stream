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
import { refundPurchase, sendVodRecoveryLink } from '../actions';

type Props = {
  purchaseId: string;
  email: string;
  amountPaid: number;
  productName: string;
  purchaseType: 'ppv' | 'vod';
  isRefunded: boolean;
  isComp: boolean;
  stripePaymentIntentId: string | null;
  stripeSessionId: string | null;
};

export default function PurchaseRowActions({
  purchaseId,
  email,
  amountPaid,
  productName,
  purchaseType,
  isRefunded,
  isComp,
  stripePaymentIntentId,
  stripeSessionId,
}: Props) {
  const [pending, startTransition] = useTransition();

  function handleCopyEmail() {
    navigator.clipboard.writeText(email);
    toast.success('Copied email', { description: email });
  }

  function handleRefund() {
    const amount = `$${(amountPaid / 100).toFixed(2)}`;
    if (
      !confirm(
        `Refund ${amount} to ${email} for "${productName}"?\n\nThis cannot be undone — Stripe will return the funds and the buyer's access will be revoked.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await refundPurchase(purchaseId);
      if (res.ok) toast.success('Refund issued', { description: email });
      else toast.error('Refund failed', { description: res.error });
    });
  }

  function handleSendRecovery() {
    startTransition(async () => {
      const res = await sendVodRecoveryLink(email);
      if (res.ok) {
        toast.success('Recovery link sent', {
          description: `${res.vodCount} replay${res.vodCount === 1 ? '' : 's'} found · ${email}`,
        });
      } else {
        toast.error('Recovery failed', { description: res.error });
      }
    });
  }

  const canRefund = !isComp && !isRefunded;
  const canSendRecovery = purchaseType === 'vod' && !isRefunded;
  const stripeUrl = stripePaymentIntentId
    ? `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`
    : stripeSessionId
      ? `https://dashboard.stripe.com/checkout/sessions/${stripeSessionId}`
      : null;

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
        {canSendRecovery && (
          <DropdownMenuItem onClick={handleSendRecovery}>Send recovery link</DropdownMenuItem>
        )}
        {stripeUrl && (
          <DropdownMenuItem onClick={() => window.open(stripeUrl, '_blank', 'noopener,noreferrer')}>
            View in Stripe
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(email);
            toast.info('Email copied — paste into Resend’s search', { description: email });
            window.open('https://resend.com/emails', '_blank', 'noopener,noreferrer');
          }}
        >
          View in Resend
        </DropdownMenuItem>
        {canRefund && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRefund} variant="destructive">
              Refund
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
