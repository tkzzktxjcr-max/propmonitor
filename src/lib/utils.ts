import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─────────────────────────────────────────────
// POSTAL CODE → PROVINCE (Belgium)
// ─────────────────────────────────────────────
export function postalCodeToProvince(postalCode: string): string {
  if (!postalCode) return "Unknown";
  
  const code = parseInt(postalCode.toString().substring(0, 2));
  
  if (code >= 10 && code <= 12) return "Brussels-Capital";
  if (code >= 13 && code <= 14) return "Walloon Brabant";
  if (code >= 15 && code <= 19) return "Flemish Brabant";
  if (code >= 20 && code <= 29) return "Antwerp";
  if (code >= 30 && code <= 39) return "Flemish Brabant";
  if (code >= 40 && code <= 49) return "Liège";
  if (code >= 50 && code <= 59) return "Namur";
  if (code >= 60 && code <= 65) return "Hainaut";
  if (code >= 66 && code <= 69) return "Luxembourg";
  if (code >= 70 && code <= 79) return "Hainaut";
  if (code >= 80 && code <= 89) return "West Flanders";
  if (code >= 90 && code <= 99) return "East Flanders";
  
  return "Unknown";
}

// ─────────────────────────────────────────────
// EXTRACT POSTAL CODE FROM ADDRESS
// ─────────────────────────────────────────────
export function extractPostalCode(address: string): string {
  if (!address) return "";
  
  // Belgian postal codes are 4 digits
  const match = address.match(/\b(\d{4})\b/);
  return match ? match[1] : "";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}