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

NOTE: For now, just create directories here to test functionality. This is a docker development limitation.

The `filer` command provides four main operations through the CLI binary located at `./bin/filer`:

### Creating Snapshots

Create a snapshot of any directory. This captures the complete state of all files and subdirectories.

```bash
./bin/filer snapshot --target-directory ./documents
# Output: Snapshot created for directory: ./documents
```

### Listing Snapshots

View all snapshots for a directory. Shows snapshot numbers and creation timestamps.

```bash
./bin/filer list --target-directory ./documents
```

**When snapshots exist:**

```
Number  Datetime
------  --------
1       Jan 15, 2024 - 14:30:25
2       Jan 16, 2024 - 09:15:42
3       Jan 16, 2024 - 16:45:18
```

**When no snapshots exist:**

```
No snapshots found for directory: ./documents
```

### Restoring Snapshots

Restore a specific snapshot to any output directory. The output directory will be created if it doesn't exist.

```bash
./bin/filer restore --target-directory ./documents --snapshot-number 2 --output-directory ./restored-documents
# Output: Snapshot 2 restored to: /tmp/restored-docs
```

### Pruning Snapshots

Remove specific snapshots to free up storage space. Only removes the snapshot metadata and any blob content not referenced by other snapshots.

```bash
./bin/filer prune --target-directory ./documents --snapshot-number 1
# Output: Snapshot 1 pruned from directory: ./documents
```

## Development

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

### Database Setup

For development, database connection is automatically configured - no additional setup required.

**Running Tests**: Tests require a separate database connection:

- Create `.env.test` with: `DATABASE_URL=<test-database-url>`
- The test database (`filer_test`) is automatically created by Docker Compose

The application uses Prisma for database operations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database schema
npx prisma studio
```
