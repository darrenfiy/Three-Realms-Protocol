FROM node:22-bookworm-slim AS runtime

ARG TRP_BUILD_COMMIT=unknown
ENV NODE_ENV=production \
    PORT=8080 \
    TRP_REPO_ROOT=/app/corpus \
    TRP_CORPUS_IMMUTABLE=1 \
    TRP_BUILD_COMMIT=${TRP_BUILD_COMMIT}

WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node corpus ./corpus

USER node
EXPOSE 8080
CMD ["node", "src/http.js"]
