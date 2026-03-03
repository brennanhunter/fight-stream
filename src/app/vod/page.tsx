import Stripe from 'stripe';
import Image from 'next/image';
import Footer from '@/components/layout/Footer';
import VodBuyButton from './VodBuyButton';
import ResumeWatchingBanner from '@/components/ResumeWatchingBanner';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getProducts() {
  const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });

  return products.data
    .filter((p) => p.metadata.s3_key && p.metadata.site === 'boxstreamtv')
    .map((p) => {
      const price = p.default_price as Stripe.Price;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0] || null,
        price: price?.unit_amount ? (price.unit_amount / 100).toFixed(2) : null,
        currency: price?.currency || 'usd',
        priceId: price?.id,
        note: p.metadata.note || null,
        featured: p.metadata.featured === 'true',
        sortOrder: parseInt(p.metadata.sort_order || '99', 10),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export default async function VodPage() {
  const products = await getProducts();

  return (
    <>
      <section className="min-h-screen bg-gradient-to-b from-black via-secondary to-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-10">
            <ResumeWatchingBanner />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-12 text-center">
            Video on Demand
          </h1>

          <div className="space-y-16">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex flex-col lg:flex-row gap-10 items-center rounded-2xl p-6 sm:p-8 ${
                  product.featured
                    ? 'bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 border-2 border-accent/50 shadow-2xl shadow-accent/20 relative'
                    : ''
                }`}
              >
                {/* Featured Badge */}
                {product.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0 z-10">
                    <span className="bg-gradient-to-r from-accent via-yellow-400 to-accent text-black text-sm font-bold px-4 py-1.5 rounded-full shadow-lg shadow-accent/30 uppercase tracking-wider">
                      🏆 Featured Event
                    </span>
                  </div>
                )}

                {/* Product Image */}
                {product.image && (
                  <div className="w-full lg:w-1/2 flex-shrink-0">
                    <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-2xl ${
                      product.featured
                        ? 'border-2 border-accent shadow-accent/30'
                        : 'border-2 border-accent/30 shadow-accent/10'
                    }`}>
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Product Info */}
                <div className="w-full lg:w-1/2 text-center lg:text-left">
                  <h2 className={`font-bold text-white mb-4 ${
                    product.featured ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
                  }`}>
                    {product.name}
                  </h2>

                  {product.description && (
                    <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  <div className="mb-6">
                    <span className={`font-bold text-accent ${
                      product.featured ? 'text-5xl' : 'text-4xl'
                    }`}>
                      ${product.price}
                    </span>
                    <span className="text-gray-400 text-lg ml-2 uppercase">
                      {product.currency}
                    </span>
                  </div>

                  {product.priceId && <VodBuyButton priceId={product.priceId} />}

                  <p className="text-sm text-gray-500 mt-4">
                    Instant access after purchase.
                  </p>

                  {product.note && (
                    <div className="mt-4 p-4 bg-yellow-900/20 border border-accent/30 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <span className="text-accent font-semibold">Note:</span> {product.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
