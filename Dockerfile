# Use the official Node.js image.
FROM node:18.20-alpine

# Set the working directory.
WORKDIR /app

# Copy package.json and package-lock.json.
COPY package*.json ./

# Install dependencies.
RUN npm install --only=production

# Copy the rest of the application code.
COPY . .

# Build the application.
RUN npm run build

# Expose the port the app runs on.
EXPOSE 3000

# Start the application.
CMD ["npm", "start"]
