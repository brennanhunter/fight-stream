export function getPromoterRate(paidCount: number): number {
  if (paidCount < 100) return 0;
  if (paidCount <= 1000) return 0.20;
  if (paidCount <= 2000) return 0.30;
  if (paidCount <= 3000) return 0.40;
  if (paidCount <= 4000) return 0.50;
  if (paidCount <= 5000) return 0.60;
  if (paidCount <= 6000) return 0.70;
  return 0.80;
}

export function getTierLabel(paidCount: number): string {
  if (paidCount < 100) return '0 – 99 purchases';
  if (paidCount <= 1000) return '100 – 1,000 purchases';
  if (paidCount <= 2000) return '1,001 – 2,000 purchases';
  if (paidCount <= 3000) return '2,001 – 3,000 purchases';
  if (paidCount <= 4000) return '3,001 – 4,000 purchases';
  if (paidCount <= 5000) return '4,001 – 5,000 purchases';
  if (paidCount <= 6000) return '5,001 – 6,000 purchases';
  return '6,001+ purchases';
}
