import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPreferredLanguage(fallback = 'bg'): string {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem('lang') ?? fallback;
}