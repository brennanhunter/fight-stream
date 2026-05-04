import { getProducts } from '@/lib/vod';
import { VOD_ACCESS_HOURS } from '@/lib/constants';
import CompVodForm from './_components/CompVodForm';

export const dynamic = 'force-dynamic';

export default async function CompVodPage() {
  const products = await getProducts();
  // Only offer products that are sellable (have an s3_key) — comping a row
  // without one would create a non-playable purchase.
  const sellable = products.filter((p) => p.available);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comp VOD access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send someone a free watch link without going through Stripe. Creates a $0 row in
          purchases so they show up in reports, then emails them the same magic link a paying
          buyer receives.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Default access window: {VOD_ACCESS_HOURS} hours from send (configurable below).
        </p>
      </div>

      <CompVodForm
        products={sellable.map((p) => ({
          id: p.id,
          name: p.name,
          eventName: p.eventName,
          price: p.price,
          image: p.image,
        }))}
        defaultTtlHours={VOD_ACCESS_HOURS}
      />
    </div>
  );
}
