# syntax=docker/dockerfile:1

########################################
# Builder
########################################
FROM golang:1.21-alpine AS builder

WORKDIR /app/backend

# Copy go.mod/go.sum first for caching
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy the whole backend (including node/ and monitor/)
COPY backend ./ 

# Which binary to build (node or monitor inside backend/)
ARG TARGET=node
ENV TARGET=${TARGET}

# Build binary from inside backend/
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o /server "./${TARGET}"

########################################
# Runtime
########################################
FROM alpine:3.18
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /server /server
EXPOSE 8080
USER app
ENTRYPOINT ["/server"]
