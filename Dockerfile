FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json server.mjs index.html login.html login.css login.js i18n.js portal.css portal.js ./
RUN mkdir -p /app/.data && chown node:node /app/.data
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
