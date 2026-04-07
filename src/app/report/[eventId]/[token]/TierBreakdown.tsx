'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const tiers = [
  { range: '0 – 99',       promoter: '0%',  platform: '100%' },
  { range: '100 – 1,000',  promoter: '20%', platform: '80%'  },
  { range: '1,001 – 2,000',promoter: '30%', platform: '70%'  },
  { range: '2,001 – 3,000',promoter: '40%', platform: '60%'  },
  { range: '3,001 – 4,000',promoter: '50%', platform: '50%'  },
  { range: '4,001 – 5,000',promoter: '60%', platform: '40%'  },
  { range: '5,001 – 6,000',promoter: '70%', platform: '30%'  },
  { range: '6,001+',       promoter: '80%', platform: '20%'  },
];

export default function TierBreakdown({ currentCount }: { currentCount: number }) {
  function isCurrentTier(range: string) {
    if (currentCount < 100 && range === '0 – 99') return true;
    if (currentCount >= 100 && currentCount <= 1000 && range === '100 – 1,000') return true;
    if (currentCount >= 1001 && currentCount <= 2000 && range === '1,001 – 2,000') return true;
    if (currentCount >= 2001 && currentCount <= 3000 && range === '2,001 – 3,000') return true;
    if (currentCount >= 3001 && currentCount <= 4000 && range === '3,001 – 4,000') return true;
    if (currentCount >= 4001 && currentCount <= 5000 && range === '4,001 – 5,000') return true;
    if (currentCount >= 5001 && currentCount <= 6000 && range === '5,001 – 6,000') return true;
    if (currentCount >= 6001 && range === '6,001+') return true;
    return false;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<button />}
        className="text-[10px] font-bold tracking-[0.15em] uppercase px-4 py-2 border border-white/30 text-gray-300 hover:border-white hover:text-white transition-all duration-200"
      >
        View All Tiers →
      </DialogTrigger>
      <DialogContent className="bg-black border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-base font-bold tracking-tight">
            Revenue Share Tiers
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-300 mb-4">
          Your rate is applied to total gross revenue based on paid purchase count.
          As you hit higher tiers, your percentage increases for all sales — not just the ones above the threshold.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">Purchases</th>
              <th className="text-center py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">Your Cut</th>
              <th className="text-center py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">Platform</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => {
              const active = isCurrentTier(tier.range);
              return (
                <tr
                  key={tier.range}
                  className={`border-b border-white/5 ${active ? 'bg-white/[0.06]' : ''}`}
                >
                  <td className="py-3 text-gray-300 flex items-center gap-2">
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                    )}
                    {!active && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                    {tier.range}
                  </td>
                  <td className={`py-3 text-center font-bold ${active ? 'text-white' : 'text-gray-300'}`}>
                    {tier.promoter}
                  </td>
                  <td className={`py-3 text-center ${active ? 'text-gray-400' : 'text-gray-400'}`}>
                    {tier.platform}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="text-[10px] text-gray-400 mt-2">
          Your current tier is highlighted. Tiers are based on total paid purchases for this event only.
        </p>
      </DialogContent>
    </Dialog>
  );
}
