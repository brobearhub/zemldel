# Redux Toolkit TypeScript Example

This example shows how to integrate Next.js with [Redux Toolkit](https://redux-toolkit.js.org).

**Redux Toolkit**(also known as "RTK" for short) provides a standardized way to write Redux logic. It includes utilities that help simplify many common use cases, including [store setup](https://redux-toolkit.js.org/api/configureStore), [creating reducers and writing immutable update logic](https://redux-toolkit.js.org/api/createreducer), and even [creating entire "slices" of state at once](https://redux-toolkit.js.org/api/createslice). This example showcases each of these features in conjunction with Next.js.

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/next.js/tree/canary/examples/with-redux&project-name=with-redux&repository-name=with-redux)

## How to Use

Execute [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example with-redux with-redux-app
```

```bash
yarn create next-app --example with-redux with-redux-app
```

```bash
pnpm create next-app --example with-redux with-redux-app
```

Deploy it to the cloud with [Vercel](https://vercel.com/new?utm_source=github&utm_medium=readme&utm_campaign=next-example) ([Documentation](https://nextjs.org/docs/deployment)).

## Local Postgres (Docker)

The project is configured to use a local Postgres instance via `DATABASE_URL` in `.env`:

```text
DATABASE_URL="postgres://postgres:postgres@localhost:5421/new_gorisons"
```

### Start database

```bash
docker compose up -d
```

### Stop database

```bash
docker compose down
```

### Stop database and delete data

```bash
docker compose down -v
```

### View logs

```bash
docker compose logs -f postgres
```

## Prisma seed & admin

### Seed categories tree (backend)

```bash
cd ../backend
npm run db:seed
```

### Seed demo providers & services (dev only)

```bash
cd ../backend
npm run db:seed:demo-services
```

### (Important) Generate Prisma client for Next build

Because Prisma generates TypeScript entrypoints that import `*.js` files (ESM),
run:

```bash
npm run db:generate
```

### Admin UI (dev only)

Start the app and open:

- `/admin/services`
