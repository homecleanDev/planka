FROM node:20-alpine as server-dependencies

RUN apk -U upgrade \
  && apk add build-base python3 \
  --no-cache

WORKDIR /app

COPY server/package.json server/package-lock.json ./

RUN mkdir logs
RUN mkdir .tmp

RUN npm install npm@latest --global \
  && npm install pnpm --global \
  && pnpm import \
  && pnpm install --prod \
  && npm rebuild bcrypt

FROM node:20 AS client

WORKDIR /app


COPY client/package.json client/package-lock.json ./

RUN npm install npm@latest --global \
  && npm install pnpm --global \
  && pnpm import \
  && pnpm install --prod \
  && npm rebuild bcrypt

COPY client .
RUN DISABLE_ESLINT_PLUGIN=true npm run build

FROM node:20-alpine

RUN apk -U upgrade \
  && apk add bash \
  --no-cache

USER node
WORKDIR /app

COPY --chown=node:node start.sh .
COPY --chown=node:node server .
COPY --chown=node:node healthcheck.js .

COPY --from=server-dependencies --chown=node:node /app/node_modules node_modules
COPY --from=server-dependencies --chown=node:node /app/logs logs
COPY --from=server-dependencies --chown=node:node /app/.tmp .tmp


COPY --from=client --chown=node:node /app/build public
COPY --from=client --chown=node:node /app/build/index.html views/index.ejs


VOLUME /app/public/user-avatars
VOLUME /app/public/project-background-images
VOLUME /app/private/attachments

EXPOSE 1337

HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
  CMD node ./healthcheck.js


CMD [ "bash", "start.sh" ]
