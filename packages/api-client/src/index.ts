// Public surface of @refproj/api-client.
//
// Same client, same endpoint shapes, two transports:
//   - cookieTransport for web (httpOnly cookies)
//   - bearerTransport for mobile (Authorization header + refresh-on-401)
//
//   import { createApiClient, cookieTransport } from '@refproj/api-client';
//   const client = createApiClient({
//     baseUrl: 'https://api.refproj.example/api/v1',
//     transport: cookieTransport({ baseUrl: '…' }),
//   });
//   const user = await client.users.me();
//   // Errors are ApiError, with .code in the ApiErrorCode enum.

export type { ApiClient, CreateApiClientArgs } from './client.js';
export { createApiClient } from './client.js';
export { ApiError } from './error.js';
export type { Transport, TransportRequest, TransportBaseArgs } from './transport.js';
export { cookieTransport } from './transports/cookie.js';
export { bearerTransport } from './transports/bearer.js';
export type { BearerTransportArgs, TokenStorage } from './transports/bearer.js';
