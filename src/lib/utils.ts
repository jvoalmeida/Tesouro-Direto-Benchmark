import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskValue(value: string | number, show: boolean): string {
  if (show) return String(value);
  return "••••";
}
