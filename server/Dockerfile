FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server/index.js ./server/index.js
COPY index.html ./index.html
COPY portal.html ./portal.html
COPY assets/ ./assets/
COPY auth/config.js auth/login.js auth/identity-platform.js ./auth/
COPY quotes.js finance.js ./
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
