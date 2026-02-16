# Build custom k6 with xk6-sql extensions
FROM golang:1.25-alpine AS builder

# Install git and build dependencies
RUN apk add --no-cache git

# Set GOTOOLCHAIN to auto to allow Go to use newer versions if needed
ENV GOTOOLCHAIN=auto

# Install xk6
RUN go install go.k6.io/xk6/cmd/xk6@latest

# Build k6 with SQL extensions
RUN xk6 build \
    --with github.com/grafana/xk6-sql \
    --with github.com/grafana/xk6-sql-driver-mysql \
    --output /k6

# Runtime stage
FROM alpine:latest

# Copy k6 binary from builder
COPY --from=builder /k6 /usr/local/bin/k6

# Set working directory
WORKDIR /scripts

# Make k6 executable
RUN chmod +x /usr/local/bin/k6

# Default entrypoint
ENTRYPOINT ["k6"]