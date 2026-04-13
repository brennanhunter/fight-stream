'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  email: string;
  type: 'ppv' | 'vod';
  surveyRef: string;
  subject: string;
  token: string;
};

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center justify-between py-4 border-b border-white/8">
      <p className="text-sm text-gray-300">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl leading-none transition-colors focus:outline-none"
            style={{ color: n <= (hovered || value) ? '#fbbf24' : '#374151' }}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SurveyForm({ email, type, surveyRef, subject, token }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [overall, setOverall] = useState(0);
  const [quality, setQuality] = useState(0);
  const [process, setProcess] = useState(0);
  const [comment, setComment] = useState('');
  const [missing, setMissing] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type,
          ref: surveyRef,
          token,
          subject,
          overall_rating: overall,
          quality_rating: quality || null,
          process_rating: process || null,
          comment: comment.trim() || null,
          what_was_missing: missing.trim() || null,
        }),
      });

      if (res.status === 409) {
        // Already submitted — treat as success
        setStep(3);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Something went wrong. Please try again.');
        return;
      }

      setStep(3);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-3">
          Quick Review
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          How was {subject}?
        </h1>
        <p className="text-sm text-gray-500">
          {type === 'ppv' ? 'Your feedback helps us improve every event.' : 'Let us know what you thought.'}
        </p>
      </div>

      {/* Step 1 — Ratings */}
      {step === 1 && (
        <div className="border border-white/10 bg-[#0a0a0a]">
          <div className="px-6 py-5 border-b border-white/10">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
              Step 1 of 2 &mdash; Ratings
            </p>
          </div>
          <div className="px-6">
            <StarRating label="Overall experience" value={overall} onChange={setOverall} />
            <StarRating label="Video quality" value={quality} onChange={setQuality} />
            <StarRating
              label="Checkout & access"
              value={process}
              onChange={setProcess}
            />
          </div>
          <div className="px-6 py-5">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={overall === 0}
              className="w-full bg-white text-black text-[11px] font-bold tracking-[0.15em] uppercase py-3.5 transition-opacity disabled:opacity-30 hover:bg-gray-100"
            >
              Continue
            </button>
            <p className="text-[10px] text-gray-600 text-center mt-3">
              Only overall rating is required
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — Comments */}
      {step === 2 && (
        <div className="border border-white/10 bg-[#0a0a0a]">
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
              Step 2 of 2 &mdash; Comments
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[10px] font-bold tracking-[0.1em] uppercase text-gray-600 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
                Tell us about your experience
                <span className="text-gray-700 ml-1 normal-case font-normal tracking-normal">
                  (optional — may appear as a testimonial)
                </span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="The stream was great, loved the replay feature..."
                className="w-full bg-black border border-white/10 text-white text-sm placeholder-gray-700 px-4 py-3 resize-none focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2">
                Anything missing or you&rsquo;d like to see?
                <span className="text-gray-700 ml-1 normal-case font-normal tracking-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={missing}
                onChange={(e) => setMissing(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="It would be great if..."
                className="w-full bg-black border border-white/10 text-white text-sm placeholder-gray-700 px-4 py-3 resize-none focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="px-6 pb-3 text-sm text-red-400">{error}</p>
          )}

          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-white text-black text-[11px] font-bold tracking-[0.15em] uppercase py-3.5 transition-opacity disabled:opacity-50 hover:bg-gray-100"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Thank you */}
      {step === 3 && (
        <div className="border border-white/10 bg-[#0a0a0a] px-8 py-12 text-center">
          <p className="text-4xl mb-6">★</p>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-amber-400 mb-3">
            Thank You
          </p>
          <h2 className="text-xl font-bold text-white tracking-tight mb-3">
            Your feedback means a lot.
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            We read every review and use it to make BoxStreamTV better for every fight.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-black text-[11px] font-bold tracking-[0.15em] uppercase px-8 py-3.5 hover:bg-gray-100 transition-colors"
          >
            Back to BoxStreamTV
          </Link>
        </div>
      )}
    </div>
  );
}
