import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskValue(value: string | number, show: boolean): React.ReactNode {
  if (show) return String(value);
  return (
    <span className="blur-[4px] select-none opacity-60 transition-all duration-300 pointer-events-none" aria-hidden="true" title="Valor oculto">
      {value || "••••••"}
    </span>
  );
}
