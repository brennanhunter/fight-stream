export interface NextTierInfo {
  nextThreshold: number;
  nextRate: number;
  currentFloor: number;
}

export function getNextTierInfo(count: number): NextTierInfo | null {
  if (count < 100)   return { nextThreshold: 100,  nextRate: 0.20, currentFloor: 0    };
  if (count <= 1000) return { nextThreshold: 1001, nextRate: 0.30, currentFloor: 100  };
  if (count <= 2000) return { nextThreshold: 2001, nextRate: 0.40, currentFloor: 1001 };
  if (count <= 3000) return { nextThreshold: 3001, nextRate: 0.50, currentFloor: 2001 };
  if (count <= 4000) return { nextThreshold: 4001, nextRate: 0.60, currentFloor: 3001 };
  if (count <= 5000) return { nextThreshold: 5001, nextRate: 0.70, currentFloor: 4001 };
  if (count <= 6000) return { nextThreshold: 6001, nextRate: 0.80, currentFloor: 5001 };
  return null; // already at max tier
}

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
