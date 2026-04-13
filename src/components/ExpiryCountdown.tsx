'use client';

import { useState, useEffect } from 'react';

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    return { label: `${days}d ${hours % 24}h`, urgency: 'low' as const };
  }
  if (hours >= 1) {
    return { label: `${hours}h ${minutes}m`, urgency: hours < 6 ? ('medium' as const) : ('low' as const) };
  }
  return { label: `${minutes}m`, urgency: 'high' as const };
}

export default function ExpiryCountdown({ expiresAt, className }: { expiresAt: string; className?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt));

  const intervalMs =
    timeLeft?.urgency === 'high' ? 10_000 :
    timeLeft?.urgency === 'medium' ? 30_000 :
    60_000;

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(expiresAt)), intervalMs);
    return () => clearInterval(interval);
  }, [expiresAt, intervalMs]);

  if (!timeLeft) return null;

  const color =
    timeLeft.urgency === 'high' ? 'text-red-400' :
    timeLeft.urgency === 'medium' ? 'text-amber-400' :
    'text-gray-500';

  const prefix =
    timeLeft.urgency === 'high' ? '⚠ Expiring soon —' :
    timeLeft.urgency === 'medium' ? 'Expires in' :
    'Expires in';

  return (
    <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${color} ${className ?? ''}`}>
      {prefix} {timeLeft.label}
    </span>
  );
}
