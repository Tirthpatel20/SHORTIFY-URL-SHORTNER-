# ZipLink — URL Shortener with Real-Time Analytics

A production-deployed URL shortener built with Next.js, PostgreSQL, Redis, BullMQ, Redis Pub/Sub, and Server-Sent Events.

The project was built to explore practical backend and system-design concepts such as caching, rate limiting, asynchronous job processing, database transactions, real-time communication, authentication, and distributed-service deployment.

## Live Demo

**Production:** https://shortifyy-url.vercel.app/

---

## Features

- User registration and login
- Session-based authentication
- Secure password hashing with bcrypt
- URL shortening using random Base62 short codes
- PostgreSQL persistence with Drizzle ORM
- Redis cache for fast URL redirects
- Per-user API rate limiting
- Asynchronous click tracking with BullMQ
- Background worker deployed separately from the web application
- PostgreSQL transactions for click recording
- Atomic click-count updates
- Redis Pub/Sub for real-time analytics events
- Server-Sent Events (SSE) for live browser updates
- Real-time analytics dashboard
- Automatic BullMQ retries with exponential backoff
- Completed BullMQ job cleanup
- Production deployment using Vercel, Railway, Neon, and Upstash Redis

---

## Architecture

                              ┌──────────────────┐
                              │     Browser      │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │      Vercel      │
                              │ Next.js App/API  │
                              └───────┬───┬──────┘
                                      │   │
                       ┌──────────────┘   └──────────────┐
                       │                                 │
                       ▼                                 ▼
                ┌─────────────┐                  ┌──────────────┐
                │   Upstash   │                  │     Neon     │
                │    Redis    │                  │  PostgreSQL  │
                └──────┬──────┘                  └──────────────┘
                       │
                       │ BullMQ
                       ▼
                ┌─────────────────┐
                │     Railway     │
                │  BullMQ Worker  │
                └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │    Neon DB   │      │ Redis Pub/Sub│
        └──────────────┘      └───────┬──────┘
                                      │
                                      ▼
                              ┌────────────────┐
                              │ SSE Connection │
                              │    / Browser   │
                              └────────────────┘

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js App Router
- Route Handlers
- Node.js

### Database

- PostgreSQL
- Neon
- Drizzle ORM

### Redis

- Upstash Redis
- Redis Pub/Sub
- Redis-based caching
- Redis-based rate limiting

### Background Processing

- BullMQ
- ioredis
- Dedicated Node.js worker

### Real-Time Communication

- Server-Sent Events (SSE)
- Redis Pub/Sub

### Authentication

- Custom session-based authentication
- bcrypt password hashing
- HTTP-only cookies

### Deployment

- Vercel — Next.js application
- Railway — BullMQ worker
- Neon — PostgreSQL
- Upstash — Redis

---

## How It Works

### 1. User Authentication

Users can create an account and log in.

Passwords are never stored directly. They are hashed using bcrypt before being stored in PostgreSQL.

After successful login:

    User
     ↓
    Login API
     ↓
    Verify password
     ↓
    Create session
     ↓
    Store session in PostgreSQL
     ↓
    Set HTTP-only session cookie

The browser automatically sends the session cookie with authenticated requests.

The server determines the current user from the session instead of trusting a `userId` supplied by the client.

---

### 2. URL Creation

When an authenticated user creates a short URL:

    Browser
       ↓
    POST /api/links
       ↓
    Authenticate user
       ↓
    Validate URL
       ↓
    Generate 7-character Base62 short code
       ↓
    Store link in PostgreSQL
       ↓
    Return short code

Short codes are generated using a cryptographically secure random number generator.

Example:

    Original URL:
    https://example.com/some/long/path

    Short URL:
    https://your-domain.com/aZ82kLm

The `shortCode` column has a unique constraint, so a collision cannot create duplicate short URLs.

---

### 3. Redis Caching

Redirects are one of the most frequently accessed operations, so the application uses a cache-aside strategy.

    GET /abc123
          ↓
    Check Redis
          │
     ┌────┴────┐
     │         │
    HIT       MISS
     │         │
     ▼         ▼
    Redirect  PostgreSQL
               │
               ▼
           Store in Redis
               │
               ▼
            Redirect

Cache keys use:

    link:{shortCode}

The cached value contains:

    {
      "originalUrl": "https://example.com",
      "linkId": 12,
      "userId": 5
    }

Cached links use a TTL of one hour.

PostgreSQL remains the source of truth.

---

### 4. Rate Limiting

The link creation API uses a Redis-based fixed-window rate limiter.

Current configuration:

    20 requests
    per user
    per 60 seconds

The Redis key is:

    rate-limit:create-link:user:{userId}

The counter is incremented atomically using Redis `INCR`.

When the limit is exceeded, the API returns:

    HTTP 429 Too Many Requests

along with a `Retry-After` header.

---

### 5. Asynchronous Click Tracking

Click tracking is intentionally separated from the redirect itself.

When a user opens a short URL:

    Browser
       ↓
    Redirect API
       ↓
    Create BullMQ job
       ↓
    Immediately redirect user

The click does not require the redirect request to wait for PostgreSQL to finish recording analytics.

The job contains:

    {
      "linkId": 12,
      "userId": 5
    }

The BullMQ worker processes this job separately.

This keeps the redirect path fast while allowing click analytics to be processed asynchronously.

---

### 6. BullMQ Worker

The worker runs as a separate Node.js process on Railway.

    BullMQ Queue
         ↓
    Railway Worker
         ↓
    Process click
         ↓
    PostgreSQL transaction

The worker performs two database operations inside the same transaction:

1. Insert a row into the `clicks` table.
2. Atomically increment `links.clickCount`.

Conceptually:

    BEGIN TRANSACTION

    INSERT INTO clicks (...)

    UPDATE links
    SET clickCount = clickCount + 1

    COMMIT

If either operation fails, the transaction rolls back.

This prevents situations where the click record exists but the counter was not updated, or vice versa.

---

### 7. BullMQ Retries

Jobs are configured with:

    3 attempts

and exponential backoff:

    Attempt 1
       ↓ failure
    ~1 second
       ↓
    Attempt 2
       ↓ failure
    ~2 seconds
       ↓
    Attempt 3

This allows temporary failures such as transient database or Redis problems to recover automatically.

Completed jobs are removed after successful processing so that Redis does not accumulate unnecessary completed-job data.

Failed jobs are retained so that failures can be inspected and debugged.

---

### 8. Redis Pub/Sub

After the database transaction succeeds, the worker publishes an analytics event to Redis Pub/Sub.

Channel:

    analytics:user:{userId}

Example message:

    {
      "type": "click",
      "linkId": 12,
      "clickCount": 21
    }

Pub/Sub is used as a notification mechanism.

It is not the source of truth.

PostgreSQL remains the source of truth for analytics data.

---

### 9. Server-Sent Events

The analytics dashboard establishes an SSE connection:

    GET /api/analytics/stream

The browser uses the native `EventSource` API.

The flow is:

    BullMQ Worker
          ↓
    Redis PUBLISH
          ↓
    SSE Route
          ↓
    EventSource
          ↓
    React State
          ↓
    Updated Analytics UI

The SSE endpoint subscribes to the authenticated user's Redis channel.

When an event arrives, the server sends it using the SSE format:

    data: {"type":"click","linkId":12,"clickCount":21}

The blank line terminates the SSE event.

The browser receives the JSON through:

    eventSource.onmessage

and updates the corresponding link's click count without refreshing the page.

---

### 10. Initial Analytics Data vs Real-Time Updates

The analytics page uses two separate mechanisms.

#### Initial state

    GET /api/analytics
           ↓
       PostgreSQL
           ↓
    Complete list of user's links

#### Live updates

    Redis Pub/Sub
           ↓
          SSE
           ↓
        Browser

This separation is intentional.

The API is the authoritative source for the complete analytics state.

SSE is only responsible for notifying the browser that something changed.

If an SSE event references a link that isn't currently present in the frontend state, the application refetches `/api/analytics`.

---

### 11. SSE Connection Cleanup

When the browser closes the analytics page or the connection is aborted:

    Browser disconnect
           ↓
    Request abort signal
           ↓
    Unsubscribe from Redis channel
           ↓
    Quit Redis subscriber connection
           ↓
    Close SSE stream

A dedicated Redis subscriber connection is created for each SSE stream because Redis connections in subscriber mode cannot be used normally for unrelated Redis commands.

---

## Database Schema

The application currently uses four main tables.

### Users

    users
    ├── id
    ├── email
    ├── passwordHash
    ├── createdAt
    └── updatedAt

### Sessions

    sessions
    ├── id
    ├── userId
    ├── expiresAt
    └── createdAt

### Links

    links
    ├── id
    ├── userId
    ├── shortCode
    ├── originalUrl
    ├── clickCount
    └── createdAt

### Clicks

    clicks
    ├── id
    ├── linkId
    └── clickedAt

Indexes are used on frequently queried relationship fields such as:

    sessions.userId
    links.userId
    clicks.linkId

The short code has a unique constraint.

---

## Reliability Model

The click-processing pipeline uses an **at-least-once** processing model.

This means a BullMQ job is designed to be processed at least once, but under a very specific worker failure window it could theoretically be processed more than once.

For example:

    Worker
       ↓
    DB transaction succeeds
       ↓
    Worker crashes before acknowledging job
       ↓
    BullMQ retries
       ↓
    Same job may execute again

This project intentionally accepts that trade-off in favor of a simpler architecture.

---

## Security Considerations

The project includes several basic security measures:

- Passwords are hashed using bcrypt.
- Authentication uses HTTP-only session cookies.
- Session records are stored server-side.
- Logout deletes both the cookie and database session.
- APIs derive the authenticated user from the session.
- User IDs are not trusted from client requests for authorization.
- Analytics queries are scoped to the authenticated user.
- URL input is validated using the `URL` API.
- Only `http` and `https` URLs are accepted.
- Link creation is rate limited.
- Database queries use Drizzle ORM rather than manually constructed SQL strings.
- Redis and database credentials are stored as environment variables.

---

## Project Structure

A simplified structure:

    app/
    ├── api/
    │   ├── analytics/
    │   │   ├── route.ts
    │   │   └── stream/
    │   │       └── route.ts
    │   ├── auth/
    │   │   ├── login/
    │   │   ├── logout/
    │   │   └── signup/
    │   ├── links/
    │   │   └── route.ts
    │   └── me/
    │
    ├── analytics/
    │   └── page.tsx
    │
    ├── login/
    │   └── page.tsx
    │
    ├── signup/
    │   └── page.tsx
    │
    ├── components/
    │
    ├── page.tsx
    │
    └── worker.ts

    db/
    ├── index.ts
    └── schema.ts

    lib/
    ├── auth.ts
    ├── bullmq.ts
    ├── queues.ts
    ├── pubSubRedis.ts
    ├── redis.ts
    ├── rateLimit.ts
    └── workerRedis.ts

---

## Environment Variables

The application uses environment variables for credentials and service configuration.

Typical variables include:

    DATABASE_URL=...

    UPSTASH_REDIS_REST_URL=...
    UPSTASH_REDIS_REST_TOKEN=...

    REDIS_URL=...

### Redis connection types

The project uses two different Redis connection mechanisms.

For normal application operations:

    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN

are used with the Upstash REST client.

For BullMQ and ioredis:

    REDIS_URL

is used as a Redis TCP connection string.

Environment files containing secrets should never be committed to Git.

---

## Local Development

### Install dependencies

    npm install

### Start Next.js

    npm run dev

### Start the BullMQ worker

In a separate terminal:

    npm run worker

The worker runs separately from the Next.js application.

The local worker loads environment variables from:

    .env.local

---

## Production Deployment

The production architecture uses separate services.

### Next.js

Deployed on:

**Vercel**

Responsible for:

- Web application
- Authentication APIs
- URL creation API
- Redirects
- Analytics API
- SSE endpoint

### BullMQ Worker

Deployed on:

**Railway**

Responsible for:

- Processing click jobs
- Updating PostgreSQL
- Publishing analytics events

### PostgreSQL

Hosted on:

**Neon**

Responsible for persistent application data.

### Redis

Hosted on:

**Upstash**

Responsible for:

- URL caching
- Rate limiting
- BullMQ queue backend
- Redis Pub/Sub

---

## Production Request Flows

### Creating a short URL

    Browser
       ↓
    POST /api/links
       ↓
    Authenticate
       ↓
    Rate limit
       ↓
    Validate URL
       ↓
    Generate short code
       ↓
    PostgreSQL
       ↓
    Return short URL

### Redirecting

    Browser
       ↓
    GET /{shortCode}
       ↓
    Redis cache
       │
       ├── HIT ──────→ Redirect
       │
       └── MISS
              ↓
          PostgreSQL
              ↓
          Redis SET
              ↓
           Redirect

    Meanwhile:

    Redirect request
          ↓
    BullMQ job
          ↓
    Railway worker
          ↓
    PostgreSQL transaction
          ↓
    Redis Pub/Sub
          ↓
    SSE
          ↓
    Analytics dashboard

---

## Design Decisions

### Why Redis caching?

Redirects are read-heavy and frequently repeated.

Caching avoids hitting PostgreSQL for every redirect.

### Why BullMQ?

Click analytics do not need to block the redirect response.

BullMQ allows the work to happen asynchronously and provides retry mechanisms.

### Why Redis Pub/Sub?

BullMQ answers:

> "What work needs to be done?"

Redis Pub/Sub answers:

> "Something just happened. Notify whoever is listening."

They serve different purposes.

### Why SSE instead of polling?

Polling requires the browser to repeatedly ask:

> "Did anything change?"

SSE allows the server to push updates over a persistent HTTP connection.

For this one-way server-to-browser analytics use case, SSE is simpler than WebSockets.

### Why PostgreSQL transactions?

The click row and click counter represent one logical operation.

A transaction keeps those database changes consistent.

---

## Key Engineering Concepts Demonstrated

This project was primarily built to gain practical experience with:

- Authentication and session management
- REST API design
- PostgreSQL data modeling
- ORM usage
- Database transactions
- Redis caching
- Cache-aside pattern
- Rate limiting
- Background job processing
- Message queues
- Retry and backoff strategies
- At-least-once processing
- Idempotency concepts
- Redis Pub/Sub
- Server-Sent Events
- Long-lived HTTP connections
- Serverless deployment
- Persistent worker deployment
- Production debugging
- Distributed-system trade-offs

---

## License

This project is for educational and portfolio purposes.
