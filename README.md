# BoxStreamTV - PPV Boxing Streaming Platform

A Next.js-powered pay-per-view boxing streaming platform featuring AWS IVS video streaming and Stripe payment processing.

## Features

- 🥊 **Live Boxing Streaming** - AWS IVS integration with token-based access control
- 💳 **Stripe Payments** - Secure PPV purchase with custom-branded checkout
- 🎨 **Boxing-Themed UI** - Red, black, and gold color scheme
- ⏱️ **Event Countdown** - Dynamic countdown timer to event start
- 📱 **Responsive Design** - Tailwind CSS for mobile-first experience
- 🔐 **JWT Session Management** - Secure access control with `jose` library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Stripe account (test or live)
- AWS IVS channel with private playback

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fight-stream
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables - Create `.env.local` in the root directory:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRODUCT_ID=prod_...
STRIPE_PRICE_ID=price_...

# JWT Secret for session management
JWT_SECRET=your-secure-random-secret-key

# AWS IVS Configuration
IVS_CHANNEL_ARN=arn:aws:ivs:...
IVS_PLAYBACK_URL=https://...cloudfront.net/...
IVS_KEY_PAIR_ARN=arn:aws:ivs:...
IVS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Testing Stripe Payments

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- Any future expiry date, any CVC, any postal code

## Project Structure

```
fight-stream/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── create-payment-intent/  # Stripe payment creation
│   │   │   ├── verify-payment/         # Payment verification & session creation
│   │   │   └── generate-token/         # IVS token generation
│   │   ├── payment-success/            # Post-payment confirmation page
│   │   └── page.tsx                    # Homepage with hero
│   ├── components/
│   │   ├── payment/
│   │   │   ├── PaymentModal.tsx        # Stripe payment modal
│   │   │   └── CheckoutForm.tsx        # Payment form with Stripe Elements
│   │   ├── player/
│   │   │   └── IVSVideoPlayer.tsx      # AWS IVS video player
│   │   └── hero/
│   │       └── Hero.tsx                # Event promotion & buy button
│   └── lib/
│       ├── stripe.ts                   # Stripe client/server initialization
│       └── session.ts                  # JWT session management utilities
└── .env.local                          # Environment variables (not committed)
```

## How It Works

### Payment Flow

1. User clicks "BUY PPV NOW" button
2. Payment modal opens with Stripe Payment Element
3. User enters email and card details
4. Stripe processes payment ($21.99)
5. User redirected to success page
6. Backend verifies payment with Stripe API
7. JWT session cookie created with event access
8. User redirected to homepage

### Video Access Flow

1. User loads video player
2. Player checks JWT session cookie
3. If valid, calls `/api/generate-token`
4. Backend verifies session has access to event
5. Generates AWS IVS token (2-hour expiry)
6. Video player loads authenticated stream

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `STRIPE_PRODUCT_ID` | Stripe product ID for PPV event |
| `STRIPE_PRICE_ID` | Stripe price ID ($21.99) |
| `JWT_SECRET` | Secret key for signing JWT session tokens |
| `IVS_CHANNEL_ARN` | AWS IVS channel ARN |
| `IVS_PLAYBACK_URL` | AWS IVS playback URL |
| `IVS_KEY_PAIR_ARN` | AWS IVS key pair ARN for token signing |
| `IVS_PRIVATE_KEY` | AWS IVS private key (PEM format) |
| `NEXT_PUBLIC_SITE_URL` | Site URL for CORS/redirects |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Payments**: Stripe Payment Element
- **Video**: AWS IVS with token authentication
- **Session**: JWT with `jose` library
- **Deployment**: Vercel (recommended)

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

**Important**: Update `NEXT_PUBLIC_SITE_URL` to your production domain

### Production Checklist

- [ ] Use Stripe live keys (`sk_live_...`, `pk_live_...`)
- [ ] Set strong `JWT_SECRET` (use `openssl rand -base64 32`)
- [ ] Configure Stripe webhooks (optional but recommended)
- [ ] Test full payment flow on production
- [ ] Monitor Stripe Dashboard for payments

## Future Enhancements

- User account system (Prisma + Supabase)
- Purchase history and replay access
- Multiple events management
- Email notifications (purchase confirmations)
- Stripe webhook handler for reliability
- Admin dashboard for event management

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [AWS IVS Documentation](https://docs.aws.amazon.com/ivs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## License

[Your License Here]
