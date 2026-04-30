// Shared transaction categories used across the app
export const TRANSACTION_CATEGORIES = [
  "Income",
  "Rent",
  "Groceries",
  "Utilities",
  "Transportation",
  "Eating Out",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Emergency Fund",
  "Investments",
  "Other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
