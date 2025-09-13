import { useState, useEffect } from "react";

const ALLOWED_RATES = [0.5, 1, 1.5, 2] as const;
const STORAGE_KEY = "filmRate";

export function usePlaybackRate(initialRate?: number) {
  const [rate, setRate] = useState<number>(() => {
    // Use initialRate if provided and valid, otherwise try localStorage, otherwise default to 1
    if (initialRate && ALLOWED_RATES.includes(initialRate as any)) {
      return initialRate;
    }
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? parseFloat(stored) : 1;
      return ALLOWED_RATES.includes(parsed as any) ? parsed : 1;
    }
    
    return 1;
  });

  const setPlaybackRate = (newRate: number) => {
    if (ALLOWED_RATES.includes(newRate as any)) {
      setRate(newRate);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newRate.toString());
      }
    }
  };

  const cycleRate = (direction: "up" | "down") => {
    const currentIndex = ALLOWED_RATES.indexOf(rate as any);
    let newIndex;
    
    if (direction === "up") {
      newIndex = currentIndex < ALLOWED_RATES.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : ALLOWED_RATES.length - 1;
    }
    
    setPlaybackRate(ALLOWED_RATES[newIndex]);
  };

  return {
    rate,
    setPlaybackRate,
    cycleRate,
    allowedRates: ALLOWED_RATES,
  };
}
