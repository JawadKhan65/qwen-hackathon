from node:18-alpine as base


from base as deps
run apk add --no-cache libc6-compat
workdir /app
copy package.json package-lock.json* ./
run npm ci --production --legacy-peer-deps

from base as builder
workdir /app
copy --from=deps /app/node_modules ./node_modules
copy . .
run npm run build


from base as runner
workdir /app
env NODE_ENV=production


run addgroup --system --gid 1001 nodejs
run adduser --system --uid 1001 nextjs

run mkdir .next
run chown nextjs:nodejs .next

copy  --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
copy  --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

user nextjs

expose 3000

env port 3000
env hostname "0.0.0.0"

cmd ["node", "server.js"]