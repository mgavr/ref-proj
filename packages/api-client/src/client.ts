import { authEndpoints } from './endpoints/auth.js';
import { usersEndpoints } from './endpoints/users.js';
import type { Transport } from './transport.js';

/**
 * Top-level client factory. Compose with cookieTransport (web) or
 * bearerTransport (mobile) — see SPEC.md §9.
 *
 * Usage on web:
 *   const client = createApiClient({
 *     baseUrl: 'https://api.refproj.example/api/v1',
 *     transport: cookieTransport({ baseUrl: 'https://api.refproj.example/api/v1' }),
 *   });
 *   const user = await client.users.me();
 *
 * Usage on mobile:
 *   const client = createApiClient({
 *     baseUrl: 'https://api.refproj.example/api/v1',
 *     transport: bearerTransport({
 *       baseUrl: 'https://api.refproj.example/api/v1',
 *       storage: secureStoreTokenStorage,
 *     }),
 *   });
 *
 * `baseUrl` appears twice on purpose: the client uses it to build
 * auth URLs (auth.googleStartUrl()), and the transport uses it to send
 * requests. They're always the same in practice; passing them
 * separately keeps the transport self-contained and testable.
 */
export interface CreateApiClientArgs {
  baseUrl: string;
  transport: Transport;
}

export interface ApiClient {
  auth: ReturnType<typeof authEndpoints>;
  users: ReturnType<typeof usersEndpoints>;
}

export function createApiClient(args: CreateApiClientArgs): ApiClient {
  return {
    auth: authEndpoints({ transport: args.transport, baseUrl: args.baseUrl }),
    users: usersEndpoints({ transport: args.transport }),
  };
}
