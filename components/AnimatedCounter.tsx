"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency } from "@/lib/formatters";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  isCurrency?: boolean;
}

export default function AnimatedCounter({
  value = 0,
  duration = 800,
  prefix = "",
  isCurrency = true,
}: AnimatedCounterProps) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);
  const prevValueRef = useRef(safeValue);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = prevValueRef.current;
    const endValue = safeValue;
    prevValueRef.current = safeValue;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Beautiful ease-out quad curve: f(t) = t * (2 - t)
      const easeProgress = progress * (2 - progress);
      
      const current = Math.floor(easeProgress * (endValue - startValue) + startValue);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [safeValue, duration]);

  return (
    <span>
      {prefix}
      {isCurrency ? formatCurrency(displayValue, false) : (displayValue ?? 0).toLocaleString("en-IN")}
    </span>
  );
}
