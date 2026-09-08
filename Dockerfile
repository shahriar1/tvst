# syntax=docker/dockerfile:1

# Build on the host platform: the output is plain JS and the runtime deps have no
# native code, so one build serves every architecture and esbuild never runs under qemu.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build && npm ci --omit=dev

FROM node:24-alpine
# alpine ships without zone data; without it every "your time" would be UTC.
RUN apk add --no-cache tzdata
ENV NODE_ENV=production TVST_CONFIG_DIR=/data
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["--help"]
