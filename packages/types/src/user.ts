import { z } from 'zod';

/**
 * The User DTO returned by the API. Mirrors the `users` table from
 * SPEC.md §3, minus internal timestamps that clients shouldn't depend on.
 *
 * `email` is normalized to lowercase server-side, so clients can compare
 * exactly without case-folding.
 */
export const User = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type User = z.infer<typeof User>;

/**
 * Body of PATCH /users/me. Only the fields a user can change themselves
 * \u2014 email and avatar come from the OAuth provider and aren't editable.
 */
export const UpdateUserRequest = z.object({
  displayName: z.string().min(1).max(80),
});

export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;
