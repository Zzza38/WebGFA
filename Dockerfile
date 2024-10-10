# Use Node.js base image
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose port 8080 to be accessible from outside the container
EXPOSE 8080

# Start the server
CMD ["node", "src/server.js"]
