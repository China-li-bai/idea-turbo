FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o launchcircle-backend ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/launchcircle-backend .
COPY --from=builder /app/.env .
EXPOSE 8080
CMD ["./launchcircle-backend"]
