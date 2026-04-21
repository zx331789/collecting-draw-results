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
