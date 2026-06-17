import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Thai-locale number formatting for money fields (totalPrice, payments,
 * dashboard summaries — P3+). Caller adds the ฿ sign at the call site since
 * not every spot wants it (e.g. inside an already-labelled "ยอดรวม:" row). */
export function formatCurrency(amount: number) {
  return amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
