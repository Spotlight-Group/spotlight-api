# Spotlight API

This repository contains a RESTful API built with AdonisJS and Docker. The application uses MySQL as its database.

## ✨ Key Features

### 🔒 Security
- **Custom Exception Handling**: Specialized exception classes for consistent error responses
- **Input Sanitization**: Protection against XSS and injection attacks
- **Rate Limiting**: API abuse prevention with configurable limits
- **Comprehensive Error Logging**: Full request context tracking
- **OAuth Security**: Cryptographically secure password generation using cuid()

### ⚡ Performance
- **Database Indexes**: Composite indexes for optimized queries (type, city, date combinations)
- **Pagination Limits**: Maximum 100 items per request to prevent overload
- **N+1 Query Prevention**: Eager loading for related data
- **Optimized City Search**: Exact match + partial match for better index utilization

### 🏗️ Architecture
- **Clean Architecture**: DTOs, Base Controllers, and layered structure
- **TypeScript**: Full type safety with explicit return types
- **API Versioning**: Ready for v1, v2, v3 evolution
- **Environment Validation**: Startup validation of all required variables

### 📊 Monitoring & Logging
- **Health Check Endpoint**: `/health` for Docker and load balancer monitoring
- **Request Logging**: Automatic logging of all API requests with performance metrics
- **Error Tracking**: Comprehensive error logging with stack traces and context

## Database schema

![Untitled-4](https://github.com/user-attachments/assets/8fe78871-7e78-43cc-bbde-0753b629aa0b)

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (if running locally)
- [PNPM](https://pnpm.io/installation) (if running locally)

## Environment Setup

The application uses environment variables defined in the `.env` file. A sample configuration is provided below:

### Required Variables

```bash
# Application
TZ=UTC
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=info
APP_KEY=tiELO02WS3byq4rRiE18S9HWW3bx9J8G
NODE_ENV=development

# Database
DB_HOST=mysql_db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=spotlight

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3333/oauth/google/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
MAIL_FROM=noreply@spotlight.com

# Frontend
FRONTENURL=http://localhost:5173

# Optional
APP_URL=http://localhost:3333
DRIVE_DISK=fs
```

## Docker Commands

### Starting the Application

To start the application and database services:

```bash
docker-compose up
```

To run in detached mode (background):

```bash
docker-compose up -d
```

### Stopping the Application

To stop the running containers:

```bash
docker-compose down
```

To stop and remove volumes (this will delete all data):

```bash
docker-compose down -v
```

### Viewing Logs

To view logs from all services:

```bash
docker-compose logs
```

To follow logs in real-time:

```bash
docker-compose logs -f
```

To view logs for a specific service:

```bash
docker-compose logs spotlight_api
docker-compose logs mysql_db
```

### Rebuilding the Application

If you make changes to the Dockerfile or application code:

```bash
docker-compose build
# or
docker-compose up --build
```

### Executing Commands Inside Containers

To run commands inside the application container:

```bash
docker-compose exec spotlight_api sh
```

To run database migrations:

```bash
docker-compose exec spotlight_api node ace migration:run
```

To run database seeders:

```bash
docker-compose exec spotlight_api node ace db:seed
```

## Running Locally (Without Docker)

### Installation

```bash
pnpm install
```

### Database Setup

Make sure you have a MySQL server running and update the `.env` file with your database credentials.

### Running Migrations

```bash
node ace migration:run
```

### Starting the Development Server

```bash
node ace serve --hmr
```

### Building for Production

```bash
pnpm run build
```

### Running Tests

The project uses [Japa](https://japa.dev/) as the testing framework with AdonisJS integration. Tests are organized into two suites:

- **Unit Tests**: Fast, isolated tests for individual components (2s timeout)
- **Functional Tests**: Integration tests for API endpoints (30s timeout)

#### Local Development

```bash
# Run all tests
pnpm test

# Run specific test suite
node ace test --suites=unit
node ace test --suites=functional

# Run tests with file watching (development)
node ace test --watch

# Run tests with coverage
node ace test --coverage

# Run specific test file
node ace test tests/functional/auth/login_controller.spec.ts

# Run tests matching a pattern
node ace test --grep="login"
```

#### Docker Environment

```bash
# Run all tests in Docker container
docker-compose exec spotlight_api pnpm test

# Run specific test suite in Docker
docker-compose exec spotlight_api node ace test --suites=unit
docker-compose exec spotlight_api node ace test --suites=functional

# Run tests with file watching in Docker
docker-compose exec spotlight_api node ace test --watch

# Run specific test file in Docker
docker-compose exec spotlight_api node ace test tests/functional/auth/login_controller.spec.ts
```

#### Test Structure

```
tests/
├── bootstrap.ts          # Japa configuration and plugins
├── unit/                 # Unit tests (isolated, fast)
│   └── auth/            # Authentication unit tests
└── functional/          # Integration tests (API endpoints)
    ├── auth/            # Authentication API tests
    └── events/          # Events API tests
```

#### Writing Tests

Tests use Japa with the following plugins:

- `@japa/assert`: Assertions library
- `@japa/api-client`: HTTP client for API testing
- `@japa/plugin-adonisjs`: AdonisJS integration

Example functional test:

```typescript
import { test } from '@japa/runner'
import { ApiClient } from '@japa/api-client'

test.group('Auth - Login Controller', () => {
  test('should login user with valid credentials', async ({ client }: { client: ApiClient }) => {
    const response = await client.post('/login').json({
      email: 'test@example.com',
      password: 'password123',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        email: 'test@example.com',
      },
    })
  })
})
```

#### Test Database

Tests automatically use a separate test database configuration. The test environment:

- Uses `NODE_ENV=test`
- Runs database migrations automatically
- Cleans up data between test runs
- Uses in-memory database for faster execution (when configured)

#### Continuous Integration

For CI/CD pipelines, run tests with:

```bash
# Set test environment
export NODE_ENV=test

# Run database migrations
node ace migration:run

# Run all tests
pnpm test

# Generate coverage report
node ace test --coverage --reporter=lcov
```

## 🏥 Health Check & Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3333/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "database": "ok",
  "memory": {
    "used": 50,
    "total": 100,
    "unit": "MB"
  }
}
```

Use this endpoint for:
- Docker health checks
- Kubernetes liveness/readiness probes
- Load balancer health monitoring
- Uptime monitoring services

### Request Logging

All API requests are automatically logged with:
- HTTP method, URL, status code
- Response time (duration)
- IP address and user agent
- User ID (when authenticated)
- Warnings for slow requests (>1s)

Logs are output in structured JSON format for easy parsing.

## API Endpoints

### Authentication

- `POST /register`: Register a new user account
- `POST /login`: Login with email and password
- `GET /oauth/:provider`: Redirect to OAuth provider (google, facebook, github, twitter)
- `GET /oauth/:provider/callback`: Handle OAuth provider callback
- `POST /forgot-password`: Send password reset email
- `GET /reset-password/:token`: Display password reset form
- `POST /reset-password`: Reset password with token

### User Management (Authenticated)

- `PUT /users/me`: Update current user profile
- `PUT /users/:id`: Update user profile by ID
- `DELETE /users/me`: Delete current user account
- `DELETE /users/:id`: Delete user account by ID
- `POST /users/:id/banner`: Upload user banner image
- `DELETE /oauth/:provider/unlink`: Unlink OAuth provider account

### Events Management (Authenticated)

- `GET /events`: Get all events with pagination and filtering
- `POST /events`: Create a new event
- `GET /events/:id`: Get event details by ID
- `PUT /events/:id`: Update event by ID
- `PATCH /events/:id`: Partially update event by ID
- `DELETE /events/:id`: Delete event by ID

### Event-Artist Relationships (Authenticated)

- `GET /events/:id/artists`: Get artists associated with an event
- `POST /events/:id/artists`: Add artists to an event
- `DELETE /events/:id/artists`: Remove artists from an event

### Artists Management (Authenticated)

- `GET /artists`: Get all artists with pagination
- `POST /artists`: Create a new artist
- `GET /artists/:id`: Get artist details by ID
- `PUT /artists/:id`: Update artist by ID
- `PATCH /artists/:id`: Partially update artist by ID
- `DELETE /artists/:id`: Delete artist by ID

### Messages Management (Authenticated)

- `POST /messages`: Create a new message for an event
- `GET /events/:eventId/messages`: Get all messages for an event
- `GET /messages/:id`: Get message details by ID
- `PUT /messages/:id`: Update message by ID
- `PATCH /messages/:id`: Partially update message by ID
- `DELETE /messages/:id`: Delete message by ID

### Documentation

- `GET /swagger`: Get API documentation in YAML format
- `GET /docs`: View interactive Swagger UI documentation

### Testing

- `GET /scrap/events/toulouse`: Scrape events from Toulouse (testing endpoint)

## API Testing with Postman

### Postman Collection

A comprehensive Postman collection (`postman_collection.json`) is included in the repository to test all API features. The collection includes:

- **Authentication**: Registration, login, OAuth flows for multiple providers
- **User Management**: Profile updates, account deletion, banner uploads
- **Events Management**: Full CRUD operations for events
- **Artists Management**: Full CRUD operations for artists
- **Messages Management**: Full CRUD operations for messages
- **Event-Artist Relationships**: Managing artist associations with events
- **Testing Scenarios**: Complete workflows for common use cases

### Setting Up Postman Environment

1. **Import the Collection**:
   - Open Postman
   - Click "Import" and select `postman_collection.json`
   - The collection will be imported with all endpoints and test scripts

2. **Configure Environment Variables**:
   Create a new environment in Postman with the following variables:

   ```
   base_url: http://localhost:3333 (or your server URL)
   auth_token: (will be set automatically after login/register)
   user_id: (will be set automatically after login/register)
   event_id: (will be set automatically after creating an event)
   artist_id: (will be set automatically after creating an artist)
   message_id: (will be set automatically after creating a message)
   oauth_code: (for OAuth testing - get from OAuth provider)
   oauth_state: (for OAuth testing - get from OAuth provider)
   reset_token: (for password reset testing - get from email)
   ```

3. **OAuth Testing Setup**:
   For OAuth testing, you'll need to:
   - Configure OAuth providers in your `.env` file
   - Use the redirect endpoints to get authorization codes
   - Update the `oauth_code` and `oauth_state` variables manually

### Running Tests

1. **Individual Endpoints**: Run any endpoint individually by selecting it and clicking "Send"

2. **Complete Workflows**: Use the "Testing Scenarios" folder for end-to-end testing:
   - **Complete User Workflow**: Registration → Profile Update → Password Reset → Login → Account Deletion
   - **Complete Event Creation Workflow**: User Registration → Artist Creation → Event Creation → Verification

3. **Automated Testing**: The collection includes test scripts that:
   - Automatically set environment variables from responses
   - Validate response structure and data
   - Check HTTP status codes
   - Ensure proper authentication flow

### Test Data Management

- The collection uses dynamic data and environment variables
- Test users are created with unique emails using timestamps
- Created resources (events, artists, messages) are automatically linked
- Clean up is handled through the testing scenarios

## Testing Guidelines

### Manual Testing

1. **Start the Application**:

   ```bash
   docker-compose up
   ```

2. **Run Database Migrations**:

   ```bash
   docker-compose exec spotlight_api node ace migration:run
   ```

3. **Import Postman Collection** and configure environment variables

4. **Test Authentication Flow**:
   - Register a new user
   - Login with credentials
   - Test OAuth providers (if configured)
   - Test password reset functionality

5. **Test CRUD Operations**:
   - Create, read, update, and delete artists
   - Create, read, update, and delete events
   - Associate artists with events
   - Create, read, update, and delete messages

### Automated Testing

Run the test suite:

```bash
pnpm test
```

### API Documentation

Access the interactive API documentation:

- **Swagger UI**: http://localhost:3333/docs
- **OpenAPI Spec**: http://localhost:3333/swagger

## Project Structure

- `app/`: Application code
  - `controllers/`: API controllers
  - `models/`: Database models
  - `middleware/`: HTTP middleware
- `config/`: Configuration files
- `database/`: Database migrations and seeders
- `start/`: Application bootstrap files
- `tests/`: Test files

## Docker Configuration

The application uses a multi-stage Docker build process:

- Base stage: Sets up the Node.js environment
- Dependencies stage: Installs all dependencies
- Build stage: Builds the application
- Production stage: Creates a minimal production image

The docker-compose.yml file defines two services:

- `mysql_db`: MySQL database
- `spotlight_api`: AdonisJS application

## License

UNLICENSED
