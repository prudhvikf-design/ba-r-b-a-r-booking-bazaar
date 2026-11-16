export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err && "message" in err && typeof (err as { message: unknown }).message === "string") {
    const msg = (err as { message: string }).message;
    if (/violates foreign key constraint/i.test(msg)) return "This item is used by existing bookings. Deactivate it instead.";
    if (/duplicate key/i.test(msg)) return "That already exists.";
    if (/row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
    if (/Failed to fetch|NetworkError/i.test(msg)) return "Network error. Check your connection and try again.";
    return msg;
  }
  return fallback;
}
