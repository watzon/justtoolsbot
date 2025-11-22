FROM oven/bun:1.3.3-alpine AS deps

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Production image, copy all the files and run bun
FROM oven/bun:1.3.3-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Add bun to PATH
ENV PATH="/root/.bun/bin:$PATH"

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 bunuser

# Copy the built application
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set ownership and permissions for the non-root user
RUN chown -R bunuser:nodejs /app
USER bunuser

# Expose port (if needed for health checks)
EXPOSE 3000

# Set the entrypoint
ENTRYPOINT ["bun", "run", "start"]
