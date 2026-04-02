# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Setup (Node.js)
# Writes the .env file with MongoDB credentials
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

# Accept MongoDB credentials as build args
ARG MONGO_DATABASE
ARG MONGO_CLUSTER

# Write the .env file — MONGO_CLUSTER must be just the host part e.g:
# username:password@cluster0.xxxxx.mongodb.net
# Do NOT include mongodb+srv:// here — application.properties already adds it
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

# Fix application.properties to use correct Spring variable syntax
# This ensures ${MONGO_CLUSTER} and ${MONGO_DATABASE} are read from env vars
RUN echo "spring.data.mongodb.uri=mongodb+srv://\${MONGO_CLUSTER}" > src/main/resources/application.properties && \
    echo "spring.data.mongodb.database=\${MONGO_DATABASE}" >> src/main/resources/application.properties

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

# Copy the setup script and package.json for reference
COPY --from=setup /setup/setup.js setup.js
COPY --from=setup /setup/package.json package.json

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the default Spring Boot port
EXPOSE 8080

# Health check — hits the Spring Boot actuator health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM tuning for containers: respect cgroup memory limits
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Launch the application — env vars passed at runtime via docker run -e
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
