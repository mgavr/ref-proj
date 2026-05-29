# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for @refproj/api.
#
# Built from the workspace root (the repo's top directory) so pnpm
# can resolve workspace:* references. App Platform's app.yaml sets
# dockerfile_path to apps/api/Dockerfile but build context to the repo
# root for exactly this reason.
#
# Stage layout:
#   deps     — install all workspace deps from the lockfile
#   build    — compile shared packages, then the API's NestJS sources
#   runtime  — slim final image with just node, dist, and prod deps
#
# Image base: node:22-bookworm-slim (Debian glibc, matches Prisma's
# default native engine). Alpine would be smaller but Prisma needs
# extra `binaryTargets = ["linux-musl-openssl-3.0.x"]` config and the
# musl libc has had Prisma compatibility quirks historically.

# ---- deps -------------------------------------------------------------
# Install workspace dependencies. The cache mount lets pnpm reuse its
# global store between builds.

FROM node:22-bookworm-slim AS deps
WORKDIR /repo

# pnpm via corepack — pinned to the version in our root package.json's
# `packageManager` field if present, otherwise the corepack default.
# We rely on the lockfile for true reproducibility.
RUN corepack enable

# Copy only the files needed to resolve and install dependencies.
# This keeps the deps stage cacheable until the lockfile actually
# changes — a source-file edit will not bust this layer.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json            apps/api/package.json
COPY apps/web/package.json            apps/web/package.json
COPY apps/mobile/package.json         apps/mobile/package.json
COPY packages/types/package.json      packages/types/package.json
COPY packages/api-client/package.json packages/api-client/package.json

# Prisma's postinstall hook needs the schema present, or it errors out
# during install. Copy it before pnpm install. The schema is tiny.
COPY apps/api/prisma                  apps/api/prisma

# Install with the lockfile frozen. --shamefully-hoist is NOT used —
# we rely on proper workspace resolution.
# OpenSSL is needed for Prisma's binary engines at runtime; install it
# here so the deps layer is self-contained.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------
# Compile shared packages and the API. Order matters: types → api-client → api.

FROM deps AS build
WORKDIR /repo

# Bring in the source tree. The lockfile-only deps layer above lets us
# put this COPY late, so source-file changes don't bust the install layer.
COPY tsconfig.base.json turbo.json ./
COPY packages packages
COPY apps/api apps/api

# Build the API's transitive dependencies first, then the API itself.
# nest build emits to apps/api/dist.
RUN pnpm --filter @refproj/types build && \
    pnpm --filter @refproj/api-client build && \
    pnpm --filter @refproj/api build

# ---- runtime ----------------------------------------------------------
# Final image. Includes node, OpenSSL (for Prisma), and the built
# workspace. We keep all of node_modules because pnpm's symlinked layout
# makes targeted copying error-prone; the resulting image is ~400MB,
# which is fine for a reference project and gives reproducible behavior.

FROM node:22-bookworm-slim AS runtime
WORKDIR /repo

ENV NODE_ENV=production
ENV PORT=8080

# Prisma needs OpenSSL at runtime. ca-certificates is needed for the
# managed Postgres SSL connection.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
      tini && \
    rm -rf /var/lib/apt/lists/*

# pnpm only for the migrate command at runtime; otherwise we use plain
# `node`.
RUN corepack enable

# Copy the whole built workspace from the build stage. Includes:
#   - packages/types/dist, packages/api-client/dist
#   - apps/api/dist
#   - node_modules (symlinks to workspace packages preserved)
#   - apps/api/prisma (schema needed for migrate deploy)
COPY --from=build /repo /repo

EXPOSE 8080

# tini handles signals correctly so SIGTERM from App Platform reaches
# the node process cleanly (graceful shutdown).
ENTRYPOINT ["/usr/bin/tini", "--"]

# Production start. Run migrations against the managed Postgres, then
# launch the compiled NestJS server. If migrations fail, the container
# exits and App Platform reports the deploy as failed — better than
# starting a server pointed at a half-migrated schema.
CMD ["sh", "-c", "cd apps/api && pnpm exec prisma migrate deploy && node dist/main.js"]
