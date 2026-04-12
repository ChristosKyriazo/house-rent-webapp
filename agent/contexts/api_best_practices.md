# API Best Practices (Production-Grade)

This document defines mandatory standards for building scalable, secure, and reliable APIs.

---

## 1. Authentication & Authorization

- Use industry standards:
  - OAuth2
  - JWT (with signature validation)

### Rules
- Validate:
  - Token signature
  - Expiration
  - Audience and issuer
- Enforce role-based access control (RBAC)
- Never trust client-provided identity data
- Implement auth at middleware layer (not per endpoint)

---

## 2. Rate Limiting & Throttling

APIs must protect against abuse and traffic spikes.

### Requirements
- Implement per:
  - User
  - API key
  - IP address

### Techniques
- Token bucket
- Leaky bucket

### Behavior
- Return HTTP 429 when limit exceeded
- Include headers:
  - Retry-After
  - X-RateLimit-Limit
  - X-RateLimit-Remaining

---

## 3. Concurrency & Parallelism

APIs must handle concurrent requests safely and efficiently.

### Rules
- Avoid blocking I/O
- Prefer async frameworks (e.g., FastAPI, asyncio)
- Limit concurrency to avoid resource exhaustion

### Patterns
- Worker pools
- Async task queues (Celery, Kafka, SQS)
- Backpressure handling

---

## 4. Bottleneck Management

Identify and mitigate performance bottlenecks.

### Common Sources
- Database queries
- External API calls
- Serialization/deserialization

### Solutions
- Caching (Redis, in-memory)
- Connection pooling
- Query optimization (indexes, partitions)
- Circuit breaker pattern

---

## 5. Logging

Logging must support debugging and observability.

### Requirements
- Structured logs (JSON format)
- Include:
  - Request ID
  - User ID (if available)
  - Timestamp
  - Endpoint
  - Status code

### Log Levels
- INFO: normal operations
- WARN: unexpected but handled
- ERROR: failures

---

## 6. Monitoring & Metrics

Track system health and performance.

### Required Metrics
- Request latency (p50, p95, p99)
- Error rate
- Throughput (requests/sec)
- Dependency latency

### Tools
- Prometheus
- OpenTelemetry
- Grafana

---

## 7. Idempotency

Critical for retry-safe operations.

### Rules
- Same request must produce same result
- Required for:
  - Payments
  - Order creation
  - External integrations

### Implementation
- Idempotency keys
- Request deduplication

---

## 8. Validation & Error Handling

### Input Validation
- Validate all incoming data at boundaries
- Reject invalid input early

### Error Format (standardized)

{
"error": "ERROR_CODE",
"message": "Human-readable explanation"
}

### Rules
- Do not expose internal stack traces
- Use consistent error codes

---

## 9. Timeouts & Retries

### Rules
- Set timeouts for:
  - Database queries
  - External API calls

### Retry Strategy
- Exponential backoff
- Max retry limit
- Avoid retry storms

---

## 10. API Design

### Standards
- RESTful endpoints
- Use proper HTTP methods:
  - GET, POST, PUT, DELETE

### Requirements
- Versioning: /v1/
- Pagination for large datasets
- Filtering and sorting support

---

## 11. Security

### Mandatory Protections
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection (if applicable)

### Transport
- HTTPS only
- Secure headers (CORS, HSTS)

---

## 12. Scalability & Deployment

### Design
- Stateless services
- Horizontal scalability

### Infrastructure
- Load balancers
- Health checks (/health endpoint)
- Auto-scaling

---

## 13. Caching Strategy

### When to cache
- Read-heavy endpoints
- Expensive computations

### Types
- Response caching
- Query caching

### Rules
- Define TTL clearly
- Avoid stale critical data

---

## 14. Dependency Management

- External services must:
  - Have timeouts
  - Be wrapped in retry logic
  - Use circuit breakers

---

## 15. Observability (Advanced)

- Distributed tracing (trace IDs across services)
- Correlate logs, metrics, and traces

---

## FINAL RULE

An API implementation is considered **incomplete** if any of the following are missing:

- Authentication/Authorization
- Rate limiting
- Logging
- Error handling
- Concurrency considerations
