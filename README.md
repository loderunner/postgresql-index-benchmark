# postgresql-index-benchmark

A benchmark runner for PostgreSQL relations with and without indexes

## Prerequisites

* [Node.js](https://nodejs.org/)
* A [PostgreSQL](https://www.postgresql.org/) database

## Setup

### Clone the repository

```shell
git clone https://github.com/loderunner/postgresql-index-benchmark.git
```

### Install dependencies

```shell
npm install
```

### Environment

Configure your environment by setting your database URL:

#### .env file

Create a `.env` file at the root of your repository, and set the `DATABASE_URL` variable to a PostgreSQL connection URL:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgresql-index-benchmark?connection_limit=20&pool_timeout=0
```

#### Shell variables

Configure your environment variable directly in your shell:

```shell
export DATABASE_URL="postgresql://postgres:password@localhost:5432/postgresql-index-benchmark?connection_limit=20&pool_timeout=0"
```

### Migrate database and generate client

Migrate the database to match the benchmark schema, and generate the [Prisma](https://www.prisma.io/) client:

```shell
npx prisma migrate dev
```

## Run

Run the benchmark:

```shell
node .
```
