This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment variables

Create a `.env.local` file in the project root (see `env.example` for a template) and set:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEEPSEEK_API_KEY=your-deepseek-api-key
NEXT_PUBLIC_DEEPSEEK_URL=https://api.deepseek.com/chat/completions
```

- `NEXT_PUBLIC_API_BASE_URL` should match the backend origin for the current environment.
- `NEXT_PUBLIC_DEEPSEEK_API_KEY` is required only if you use the AI rewrite feature on the products page.
- `NEXT_PUBLIC_DEEPSEEK_URL` defaults to DeepSeek's chat endpoint but can be overridden if needed.

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

The dev server is configured to bind to `0.0.0.0`, making it accessible via your EC2 IP address (e.g., `http://13.234.126.192:7000`) or locally at `http://localhost:7000`.

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
