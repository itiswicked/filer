# Filer

A command-line file snapshot management tool that allows you to create, manage, and restore directory snapshots with intelligent content deduplication.

## Summary

Filer is a backup and versioning tool that captures point-in-time snapshots of directory trees. It stores file content in a PostgreSQL database with content-based deduplication, meaning identical files across different snapshots only consume storage space once. Each snapshot preserves the complete directory structure and file contents, allowing you to restore any previous state of your directories.

### Key Features

- **Create Snapshots**: Capture the complete state of any directory
- **List Snapshots**: View all available snapshots with timestamps for any directory
- **Restore Snapshots**: Restore any snapshot to any output location
- **Prune Snapshots**: Remove specific snapshots to free up storage
- **Content Deduplication**: Automatically eliminates duplicate file storage using SHA-256 hashing
- **PostgreSQL Backend**: Reliable database storage for metadata and file content
- **Docker Deployment**: Containerized for easy setup and deployment

## Installation

### Prerequisites

- Docker and Docker Compose
- Git

### Setup

```bash
git clone <repository-url> && cd filer
docker compose up -d
```

Verify installation:

```bash
./bin/filer --help
```

## Usage and Capabilities

The `filer` command provides four main operations:

### Creating Snapshots

Create a snapshot of any directory:

```bash
./bin/filer snapshot --target-directory /home/user/documents
# Output: Snapshot created for directory: /home/user/documents
```

### Listing Snapshots

View all snapshots for a directory:

```bash
./bin/filer list --target-directory /home/user/documents
# Output:
# Number  Datetime
# ------  --------
# 1       Jan 15, 2024 - 14:30:25
# 2       Jan 16, 2024 - 09:15:42
# 3       Jan 16, 2024 - 16:45:18
```

### Restoring Snapshots

Restore a specific snapshot to any output directory:

```bash
./bin/filer restore --target-directory /home/user/documents --snapshot-number 2 --output-directory /tmp/restored-docs
# Output: Snapshot 2 restored to: /tmp/restored-docs
```

### Pruning Snapshots

```bash
./bin/filer prune --target-directory /home/user/documents --snapshot-number 1
# Output: Snapshot 1 pruned from directory: /home/user/documents
```

## Development

### Environment Configuration

Create the required environment files with your database connection string:

**`.env`** (for development):

```bash
DATABASE_URL=<postgres_database_dev_url>
```

**`.env.test`** (for testing):

```bash
DATABASE_URL=<postgres_database_test_url>
```

Note: When using Docker Compose, the database URL is automatically configured. These files are needed for local development or custom deployments

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Database Management

The application uses Prisma for database operations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database schema
npx prisma studio
```
