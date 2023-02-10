FROM node:18

WORKDIR /app

ADD package.json package.json

RUN apt-get update && apt-get install sqlite3 libsqlite3-dev -y
RUN npm install

COPY . .

ENTRYPOINT ["npm"]