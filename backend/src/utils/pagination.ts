/**
 * Calculates pagination parameters from query strings.
 * Clamps page and limit to safe ranges.
 * @param query - Object with page and limit string values
 * @returns Parsed pagination with offset
 */
export function getPaginationParams(query: { page?: string; limit?: string }): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit || '20', 10) || 20)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
