// Public surface of @refproj/types.
//
// Every export is paired: a Zod schema (PascalCase) for runtime validation
// and a TypeScript type (same name) inferred from it. Import whichever you
// need; they're guaranteed to stay in sync.
//
//   import { User, MobileVerifyRequest } from '@refproj/types';
//   const u: User = User.parse(jsonFromApi);

export * from './errors.js';
export * from './providers.js';
export * from './user.js';
export * from './auth.js';
