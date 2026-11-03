# Canlı sunucu imajı (Hetzner). GitHub Actions derler (.github/workflows/yayin.yml), sunucu yalnızca çeker.
# Yerelde denemek için: docker build --secret id=env,src=.env -t mertkitap .
#
# Derleme sırasında veritabanı okunur (Cache Components sayfaların sabit kısmını önceden üretir) ve NEXT_PUBLIC_*,
# SITE_INDEXABLE, R2_PUBLIC_URL gibi değerler derlemeye gömülür. Bu yüzden canlı .env derlemeye "secret" olarak
# verilir: yalnızca o adımda okunur, imaja yazılmaz.

FROM node:24-bookworm-slim AS base
# Prisma'nın sorgu motoru OpenSSL ister.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall `prisma generate` çalıştırır; Linux motoru burada üretilir.
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN --mount=type=secret,id=env,required=true \
    set -a && . /run/secrets/env && set +a && \
    npm run build && \
    mkdir -p public

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
