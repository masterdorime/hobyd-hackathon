export function formatIdr(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error("IDR amount must be a safe integer");
  }

  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}
