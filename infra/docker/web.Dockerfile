FROM node:20-bookworm-slim
WORKDIR /app
COPY apps/web/package*.json /app/apps/web/
WORKDIR /app/apps/web
RUN npm install
COPY apps/web /app/apps/web
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
