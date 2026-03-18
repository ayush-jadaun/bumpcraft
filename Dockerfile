FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
RUN addgroup -S bumpcraft && adduser -S bumpcraft -G bumpcraft
USER bumpcraft
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok||process.exit(1)).catch(()=>process.exit(1))"
CMD ["node", "dist/api/server.js"]
