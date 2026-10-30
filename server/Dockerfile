# Production image for an authenticated DizzyOps API; no seed records or credentials.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server/ ./server/
COPY index.html portal.html portal-app.js portal-routes.js portal-ui.css ./
COPY operations-schema.js operations-ui.js operations-ui.css ./
COPY quotes.js finance.js sage-readiness.js ./
COPY assets/ ./assets/
COPY auth/config.js auth/login.js auth/identity-platform.js ./auth/
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
