import type { UpdateUserRequest, User } from '@refproj/types';
import type { Transport } from '../transport.js';

/**
 * /users/me endpoints. Same on web and mobile — only the transport
 * differs (cookies vs. Authorization).
 */
export function usersEndpoints(args: { transport: Transport }) {
  return {
    /**
     * Get the currently authenticated user. Throws ApiError with
     * code='UNAUTHENTICATED' if there's no session.
     */
    me(): Promise<User> {
      return args.transport.request<User>({
        method: 'GET',
        path: '/users/me',
      }) as Promise<User>;
    },

    updateMe(dto: UpdateUserRequest): Promise<User> {
      return args.transport.request<User>({
        method: 'PATCH',
        path: '/users/me',
        body: dto,
      }) as Promise<User>;
    },

    deleteMe(): Promise<null> {
      return args.transport.request<null>({
        method: 'DELETE',
        path: '/users/me',
      }) as Promise<null>;
    },
  };
}
