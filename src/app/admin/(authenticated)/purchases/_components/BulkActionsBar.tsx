'use client';

import { useState } from 'react';
import { Gift, Mail, RotateCcw, Wallet } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import AdminGrantForm from '../../../AdminGrantForm';
import AdminSendVodRecoveryForm from '../../../AdminSendVodRecoveryForm';
import AdminRefundBackfillButton from '../../../AdminRefundBackfillButton';
import AdminVodAmountBackfillButton from '../../../AdminVodAmountBackfillButton';

export default function BulkActionsBar({
  activeEventId,
  activeEventName,
}: {
  activeEventId: string | null;
  activeEventName: string | null;
}) {
  const [openSheet, setOpenSheet] = useState<'grant' | 'recovery' | 'backfill' | 'vodamount' | null>(null);

  const triggerClass = buttonVariants({ variant: 'outline', size: 'sm' });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sheet open={openSheet === 'grant'} onOpenChange={(o) => setOpenSheet(o ? 'grant' : null)}>
        <SheetTrigger className={triggerClass}>
          <Gift className="h-3.5 w-3.5" />
          Grant Access
        </SheetTrigger>
        <SheetContent className="dark bg-background text-foreground">
          <SheetHeader>
            <SheetTitle>Grant Access</SheetTitle>
            <SheetDescription>
              Comp a customer onto a PPV event or VOD product. Creates a $0 purchase row.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AdminGrantForm activeEventId={activeEventId} activeEventName={activeEventName} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'recovery'} onOpenChange={(o) => setOpenSheet(o ? 'recovery' : null)}>
        <SheetTrigger className={triggerClass}>
          <Mail className="h-3.5 w-3.5" />
          Send VOD Recovery
        </SheetTrigger>
        <SheetContent className="dark bg-background text-foreground">
          <SheetHeader>
            <SheetTitle>Send VOD Recovery Link</SheetTitle>
            <SheetDescription>
              For guest VOD buyers who lost the cookie or are on a new device. Emails them a one-click link to restore access.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AdminSendVodRecoveryForm />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'backfill'} onOpenChange={(o) => setOpenSheet(o ? 'backfill' : null)}>
        <SheetTrigger className={triggerClass}>
          <RotateCcw className="h-3.5 w-3.5" />
          Refund Backfill
        </SheetTrigger>
        <SheetContent className="dark bg-background text-foreground">
          <SheetHeader>
            <SheetTitle>Backfill Refunds</SheetTitle>
            <SheetDescription>
              Scan the last 24 hours of Stripe refunds and stamp matching purchases with their refund timestamp. Safe to re-run — already-marked purchases are skipped.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AdminRefundBackfillButton />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'vodamount'} onOpenChange={(o) => setOpenSheet(o ? 'vodamount' : null)}>
        <SheetTrigger className={triggerClass}>
          <Wallet className="h-3.5 w-3.5" />
          Fix VOD Amounts
        </SheetTrigger>
        <SheetContent className="dark bg-background text-foreground">
          <SheetHeader>
            <SheetTitle>Backfill VOD Amounts</SheetTitle>
            <SheetDescription>
              For each VOD purchase, looks up the actual amount charged via Stripe and corrects{' '}
              <code>amount_paid</code> when it disagrees with what was recorded. Use this to fix rows
              created before the promo-code webhook fix.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <AdminVodAmountBackfillButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
