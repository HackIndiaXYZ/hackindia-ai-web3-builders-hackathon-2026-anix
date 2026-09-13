FROM node:20-alpine
WORKDIR /app

# Only package.json exists in this project (it was created with Bun/bun.lock,
# not npm), so we let npm resolve and generate its own lockfile in the image.
COPY package.json ./
RUN npm install

COPY . .

# Keep uploaded files outside the image layer so they survive rebuilds
# when this path is mounted as a volume (see docker-compose.yml).
VOLUME ["/app/uploads"]

EXPOSE 4000
CMD ["npm", "start"]
