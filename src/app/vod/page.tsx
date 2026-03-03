import Stripe from 'stripe';
import Image from 'next/image';
import Footer from '@/components/layout/Footer';
import VodBuyButton from './VodBuyButton';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getProduct() {
  const product = await stripe.products.retrieve(process.env.STRIPE_PRODUCT_ID!);
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);

  return {
    name: product.name,
    description: product.description,
    image: product.images?.[0] || null,
    price: price.unit_amount ? (price.unit_amount / 100).toFixed(2) : null,
    currency: price.currency,
  };
}

export default async function VodPage() {
  const product = await getProduct();

  return (
    <>
      <section className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col lg:flex-row gap-10 items-center">
            {/* Product Image */}
            {product.image && (
              <div className="w-full lg:w-1/2 flex-shrink-0">
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-accent/30 shadow-2xl shadow-accent/10">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                {product.name}
              </h1>

              {product.description && (
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="mb-8">
                <span className="text-5xl font-bold text-accent">
                  ${product.price}
                </span>
                <span className="text-gray-400 text-lg ml-2 uppercase">
                  {product.currency}
                </span>
              </div>

              <VodBuyButton />

              <p className="text-sm text-gray-500 mt-4">
                Instant access after purchase. Watch anytime within 1 hour of starting.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
