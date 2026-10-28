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

## Support feedback email

The dashboard support form sends feedback through Resend to `support@jnsystem.app`.
Configure these server-side environment variables locally and in the deployment
environment:

- `RESEND_API_KEY`: a Resend API key with permission to send email.
- `RESEND_FROM_EMAIL`: a sender address or display-name address on a domain
  verified in Resend (for example, `JNS Support <support@jnsystem.app>`).

Feedback replies are directed to the authenticated user's account email.
Run `npm run check:env` to check that the required Supabase and support-email
variables are present locally. In Vercel, configure the same variables for each
environment (Development, Preview, and Production) and redeploy after changes.
The check verifies presence only; confirm the sender domain in Resend and send a
test feedback message to verify delivery.

The required variables are `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
and `RESEND_FROM_EMAIL`. Keep the service-role and Resend keys server-side; do
not use a `NEXT_PUBLIC_` prefix for either.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
