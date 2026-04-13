import { createServerClient } from '@/lib/supabase';

type FeedbackRow = {
  id: string;
  display_name: string | null;
  subject: string;
  overall_rating: number;
  comment: string;
  trigger_type: string;
};

export default async function Testimonials() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('feedback')
    .select('id, display_name, subject, overall_rating, comment, trigger_type')
    .eq('approved_for_testimonial', true)
    .not('comment', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6);

  const testimonials = (data ?? []) as FeedbackRow[];

  if (testimonials.length === 0) return null;

  return (
    <section className="bg-black text-white py-20 border-t border-white/8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <div className="mb-14">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
            Fans
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            What Viewers Are Saying
          </h2>
          <div className="w-16 h-[2px] bg-white mt-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="border border-white/10 bg-[#0a0a0a] p-6 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-5" aria-label={`${t.overall_rating} out of 5 stars`} role="img">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    aria-hidden="true"
                    className="text-lg leading-none"
                    style={{ color: n <= t.overall_rating ? '#fbbf24' : '#1f2937' }}
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-gray-200 text-sm leading-relaxed flex-1 mb-5">
                &ldquo;{t.comment}&rdquo;
              </p>

              {/* Attribution */}
              <div className="border-t border-white/8 pt-4">
                <p className="text-white text-sm font-semibold">
                  {t.display_name ?? 'BoxStreamTV Fan'}
                </p>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-600 mt-0.5">
                  {t.subject}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
