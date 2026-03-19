'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FadeInView } from '@/components/motion';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('https://formspree.io/f/xwpolbjr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen bg-black pt-24 pb-16 px-4"
    >
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-3">
            Get Started
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Contact Us
          </h1>
          <div className="w-16 h-[2px] bg-white mt-6" />
          <p className="text-lg text-gray-400 mt-6 max-w-2xl leading-relaxed">
            Ready to stream your next boxing event? Get in touch with us today.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <FadeInView delay={0.1}>
          <div className="space-y-6">
            <div className="group relative overflow-visible p-8">
              <div className="absolute inset-0 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5),0_0_30px_rgba(255,255,255,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.5),0_0_100px_rgba(255,255,255,0.3)]" />
              <h2 className="text-2xl font-bold text-white mb-6">Get In Touch</h2>

              {/* Ryan Ross */}
              <div className="mb-8 pb-8 border-b border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Ryan Ross</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-400">
                    <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:ryanmiross@gmail.com" className="hover:text-white transition-colors">
                      ryanmiross@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href="tel:386-747-8250" className="hover:text-white transition-colors">
                      386-747-8250
                    </a>
                  </div>
                </div>
              </div>

              {/* Hunter Coleman */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Hunter Coleman</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-400">
                    <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href="mailto:hunter@xtremery.com" className="hover:text-white transition-colors">
                      hunter@xtremery.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <svg className="w-5 h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href="tel:406-868-5850" className="hover:text-white transition-colors">
                      406-868-5850
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="group relative overflow-visible p-8">
              <div className="absolute inset-0 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5),0_0_30px_rgba(255,255,255,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.5),0_0_100px_rgba(255,255,255,0.3)]" />
              <h3 className="text-lg font-bold text-white mb-4">Why Choose Box Stream TV?</h3>
              <ul className="space-y-3 text-gray-400">
                {[
                  'No upfront production costs',
                  'Professional multi-camera coverage',
                  'Revenue sharing model',
                  'High-quality footage for promotion',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-white mt-0.5">&mdash;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </FadeInView>

          {/* Contact Form */}
          <FadeInView delay={0.2}>
          <div className="group relative overflow-visible p-8">
            <div className="absolute inset-0 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5),0_0_30px_rgba(255,255,255,0.3)] animate-pulse pointer-events-none z-10 transition-shadow duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.5),0_0_100px_rgba(255,255,255,0.3)]" />
            <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>

            {status === 'success' && (
              <div className="mb-6 p-4 border border-white/30 bg-white/5 text-white">
                Thank you! We&apos;ll get back to you soon.
              </div>
            )}

            {status === 'error' && (
              <div className="mb-6 p-4 border border-red-500/50 bg-red-500/10 text-red-300">
                Something went wrong. Please try again or contact us directly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent border border-white/20 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent border border-white/20 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent border border-white/20 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                  placeholder="What can we help you with?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-bold tracking-[0.15em] uppercase text-gray-400 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-transparent border border-white/20 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors resize-none"
                  placeholder="Tell us about your event..."
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-white text-black font-bold py-4 px-8 text-sm tracking-[0.15em] uppercase transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          </FadeInView>
        </div>
      </div>
    </motion.div>
  );
}
