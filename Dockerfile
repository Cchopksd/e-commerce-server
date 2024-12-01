FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 5500

CMD ["npm", "run", "start:prod"]
