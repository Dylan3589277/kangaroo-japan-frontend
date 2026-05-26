This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Smoke

Authenticated production smoke uses a local-only `.env.production-smoke.local`
file. Keep it out of git.

```powershell
npm run test:prod-smoke:auth
```

Strict legacy DSR readonly smoke is opt-in. Run it only after the backend
production environment has `DSR_LEGACY_READONLY_TOKEN` configured server-side.
The browser must not receive or store that token.

```powershell
$env:DSR_LEGACY_SMOKE_ORDER_ID="<real legacy order id>"
npm run test:prod-smoke:dsr
```

The strict DSR smoke checks these protected routes without sending
`x-dsr-legacy-token` from the frontend/test client:

- `/api/v1/orders/admin/legacy-dsr/mine`
- `/api/v1/orders/admin/legacy-dsr/detail`
- `/api/v1/warehouse/legacy-dsr/orders`
- `/api/v1/warehouse/legacy-dsr/ships`
- `/api/v1/warehouse/legacy-dsr/photos`
