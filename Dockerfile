FROM node:16

# Create the bot's directory
# RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

COPY package.json . 
RUN npm install

COPY . . 
RUN npm run build

# Start the bot.
CMD ["npm", "run", "start"]