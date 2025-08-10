# Start from Node with Debian/Ubuntu so we can apt-get
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
RUN npx playwright install

# Copy rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
