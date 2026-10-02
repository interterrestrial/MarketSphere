/**
 * Shared zod issue formatting: [{ path: "quantity", message: "..." }].
 * Used by the Express `validate` middleware and Next.js route handlers.
 */
export function zodFieldDetails(error: unknown): Array<{ path: string; message: string }> {
  if (typeof error === "object" && error !== null && "issues" in error) {
    const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> })
      .issues;
    return issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  }
  return [];
}
