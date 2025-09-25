import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { retryWithBackoff, sanitizeInput } from "./client-utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export utilities from client-utils.ts for convenience
export { retryWithBackoff, sanitizeInput } from './client-utils';
