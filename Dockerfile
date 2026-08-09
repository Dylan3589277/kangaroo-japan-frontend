# 2026-08-09 前端容器化（迁移阿里云 ECS）。standalone 产物：仅带运行所需文件。
# NEXT_PUBLIC_* 与 rewrite 目标是 build 期内联，经 build-args 注入（publishable/site key
# 本就是发给浏览器的公开值，不属机密）。ECS 上用 --network host 运行（PORT=3200），
# 此时 BACKEND_ORIGIN=http://127.0.0.1:3100 指向同机后端容器。

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# husky 的 prepare 钩子在无 .git 的构建环境会失败,容器里不需要 git hooks
ENV HUSKY=0
RUN npm ci --ignore-scripts
COPY . .
ARG KANGAROO_JAPAN_BACKEND_ORIGIN
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV KANGAROO_JAPAN_BACKEND_ORIGIN=$KANGAROO_JAPAN_BACKEND_ORIGIN \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tokyo
# standalone 不自动带 public/.next/static，需手动拷（见 next output 文档）
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3200
ENV PORT=3200
CMD ["node", "server.js"]
