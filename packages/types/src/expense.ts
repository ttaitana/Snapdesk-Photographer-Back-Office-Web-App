import { z } from "zod";
import { cuidSchema } from "./common";

/** Free text, not an enum — เดินทาง/อุปกรณ์/ผู้ช่วย/อื่นๆ are suggestions shown in
 * the UI, same precedent as Customer.channel/Job.shootType. */
export const expenseCategorySchema = z.string().min(1);

export const expenseSchema = z.object({
  id: cuidSchema,
  teamId: cuidSchema,
  createdById: cuidSchema,
  jobId: cuidSchema.nullable().optional(),
  category: expenseCategorySchema,
  amount: z.number().nonnegative(),
  spentAt: z.coerce.date(),
  note: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expenseInputSchema = z.object({
  teamId: cuidSchema,
  jobId: cuidSchema.optional(),
  category: expenseCategorySchema,
  amount: z.number().nonnegative("จำนวนเงินต้องไม่ติดลบ"),
  spentAt: z.coerce.date().optional(),
  note: z.string().optional(),
  receiptUrl: z.string().url("ลิงก์ใบเสร็จไม่ถูกต้อง").optional().or(z.literal("")),
});
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const updateExpenseInputSchema = expenseInputSchema.partial().extend({
  id: cuidSchema,
  teamId: cuidSchema,
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

/** Suggested category presets shown in the form's datalist/select — not an
 * exhaustive enum, the field itself stays free text (see expenseCategorySchema). */
export const SUGGESTED_EXPENSE_CATEGORIES = ["เดินทาง", "อุปกรณ์", "ผู้ช่วย", "อื่นๆ"] as const;
