# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Setup (Node.js)
# Runs setup.js to initialise git, write .env, and prepare the workspace
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS setup

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Backend — movieist setup stage (Node.js)"

WORKDIR /setup

# Copy setup script and package manifest
COPY package.json .
COPY setup.js .

# No external npm dependencies, but install validates package.json is valid
RUN npm install

# Accept MongoDB credentials as build args so setup.js can write the .env
ARG MONGO_DATABASE
ARG MONGO_CLUSTER

# Write the .env file non-interactively using Node directly
# (bypasses the interactive readline prompts in setup.js)
RUN mkdir -p src/main/resources && \
    echo "MONGO_DATABASE=${MONGO_DATABASE}" > src/main/resources/.env && \
    echo "MONGO_CLUSTER=${MONGO_CLUSTER}" >> src/main/resources/.env

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build (Maven + JDK 17)
# Compiles the Spring Boot app and packages it as a JAR
# ─────────────────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Backend — movieist Spring Boot app (build stage)"

WORKDIR /app

# Copy the Maven project descriptor first (layer-cache friendly)
COPY pom.xml .

# Pre-download all dependencies so subsequent builds are faster
RUN mvn dependency:go-offline -B

# Copy the full source tree
COPY src ./src

# Pull the .env written by the setup stage into the correct resource path
COPY --from=setup /setup/src/main/resources/.env src/main/resources/.env

# Package the application, skipping tests (tests run in CI)
RUN mvn clean package -DskipTests -B

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Runtime (JRE Alpine)
# Slim, secure image that runs only the compiled JAR
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

LABEL maintainer="DigitalWitch"
LABEL description="Netflix Backend — movieist Spring Boot app (runtime stage)"
LABEL version="0.0.1-SNAPSHOT"

# Create a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only the built JAR from the build stage
COPY --from=build /app/target/movieist-0.0.1-SNAPSHOT.jar app.jar

# Copy the .env from the setup stage
COPY --from=setup /setup/src/main/resources/.env .env

# Copy the setup script and package.json for reference / manual re-runs
COPY --from=setup /setup/setup.js setup.js
COPY --from=setup /setup/package.json package.json

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the default Spring Boot port
EXPOSE 8080

# Health check — hits the Spring Boot actuator health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# JVM tuning for containers: respect cgroup memory limits
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Launch the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]