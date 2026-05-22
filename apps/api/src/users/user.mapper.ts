import type { User as DbUser } from '@prisma/client';
import type { User } from '@refproj/types';

/**
 * Convert a Prisma User row to the public DTO defined in @refproj/types.
 *
 * Centralized so we have one place to add fields when the DTO grows,
 * and one place to filter fields we don't want to expose (e.g. if we
 * ever add a `passwordHash` column, it never leaks accidentally).
 */
export function toUserDto(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
