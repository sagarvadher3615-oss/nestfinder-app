FROM node:20-slim

WORKDIR /app

# Install yarn
RUN npm install -g yarn

# Copy package files first for better layer caching
COPY package.json yarn.lock ./

# Copy scripts needed by preinstall hook
COPY scripts/ ./scripts/

# Install dependencies (skip the cmd-guard preinstall hook — not needed in Docker)
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy the rest of the source
COPY . .

# Expose Expo web port
EXPOSE 8081

# Start Expo in web mode (non-interactive, no tunnel)
CMD ["yarn", "expo", "start", "--web", "--host", "lan", "--port", "8081", "--non-interactive"]
