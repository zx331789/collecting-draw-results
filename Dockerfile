# syntax=docker/dockerfile:1

# CapRover 部署 Dockerfile
# 使用方法：
# 1. 本地执行：pnpm build
# 2. 打包部署：sh prepare-deploy.sh
# 3. 上传 netdisk-session-deploy.tar.gz 到 CapRover

FROM node:22.19.0-alpine

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

WORKDIR /app

# 先复制 package.json 和 lockfile（利用 Docker 层缓存，依赖不变时跳过安装）
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY build ./build

# 暴露端口
EXPOSE 80

# 启动应用
CMD ["node", "build/index.js"]
# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
