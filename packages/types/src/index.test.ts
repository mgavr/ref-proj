import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  ApiErrorBody,
  MobileVerifyRequest,
  OAuthProvider,
  TokenPair,
  UpdateUserRequest,
  User,
} from './index.js';

describe('OAuthProvider', () => {
  it('accepts the three configured providers', () => {
    for (const p of ['google', 'facebook', 'github'] as const) {
      assert.equal(OAuthProvider.parse(p), p);
    }
  });

  it('rejects unknown providers', () => {
    assert.throws(() => OAuthProvider.parse('twitter'));
  });
});

describe('User', () => {
  const valid = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'a@b.co',
    displayName: 'Alice',
    avatarUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('accepts a well-formed user with null avatar', () => {
    assert.deepEqual(User.parse(valid), valid);
  });

  it('accepts a user with an avatar URL', () => {
    const withAvatar = { ...valid, avatarUrl: 'https://example.com/a.png' };
    assert.deepEqual(User.parse(withAvatar), withAvatar);
  });

  it('rejects non-UUID id', () => {
    assert.throws(() => User.parse({ ...valid, id: 'not-a-uuid' }));
  });

  it('rejects an empty displayName', () => {
    assert.throws(() => User.parse({ ...valid, displayName: '' }));
  });

  it('rejects a non-ISO createdAt', () => {
    assert.throws(() => User.parse({ ...valid, createdAt: '2024-01-01' }));
  });
});

describe('UpdateUserRequest', () => {
  it('accepts a valid displayName', () => {
    assert.deepEqual(UpdateUserRequest.parse({ displayName: 'Bob' }), {
      displayName: 'Bob',
    });
  });

  it('rejects displayName longer than 80 chars', () => {
    assert.throws(() =>
      UpdateUserRequest.parse({ displayName: 'x'.repeat(81) }),
    );
  });
});

describe('MobileVerifyRequest discriminated union', () => {
  it('accepts google with idToken', () => {
    const parsed = MobileVerifyRequest.parse({
      provider: 'google',
      idToken: 'eyJhbGc...',
    });
    assert.equal(parsed.provider, 'google');
  });

  it('rejects google without idToken', () => {
    assert.throws(() =>
      MobileVerifyRequest.parse({ provider: 'google' }),
    );
  });

  it('accepts github with code + verifier + redirectUri', () => {
    const parsed = MobileVerifyRequest.parse({
      provider: 'github',
      code: 'abc',
      codeVerifier: 'xyz',
      redirectUri: 'refproj://auth/github',
    });
    assert.equal(parsed.provider, 'github');
  });

  it('rejects github with idToken (wrong shape for provider)', () => {
    assert.throws(() =>
      MobileVerifyRequest.parse({
        provider: 'github',
        idToken: 'eyJhbGc...',
      }),
    );
  });
});

describe('TokenPair', () => {
  it('requires positive integer expiresIn', () => {
    assert.throws(() =>
      TokenPair.parse({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: -1,
      }),
    );
    assert.throws(() =>
      TokenPair.parse({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 1.5,
      }),
    );
  });
});

describe('ApiErrorBody', () => {
  it('accepts a minimal error', () => {
    const parsed = ApiErrorBody.parse({
      error: { code: 'UNAUTHENTICATED', message: 'login required' },
    });
    assert.equal(parsed.error.code, 'UNAUTHENTICATED');
  });

  it('accepts details of any shape', () => {
    const parsed = ApiErrorBody.parse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'bad input',
        details: { fieldIssues: [{ path: ['email'], message: 'invalid' }] },
      },
    });
    assert.ok(parsed.error.details);
  });

  it('rejects unknown error codes', () => {
    assert.throws(() =>
      ApiErrorBody.parse({
        error: { code: 'NEW_THING', message: 'x' },
      }),
    );
  });
});
