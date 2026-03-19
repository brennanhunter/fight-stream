'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newEvents, setNewEvents] = useState(true);
  const [promotions, setPromotions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
      }

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('new_events, promotions')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        setNewEvents(prefs.new_events);
        setPromotions(prefs.promotions);
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (profileError) {
      setMessage('Failed to update profile.');
      setSaving(false);
      return;
    }

    // Upsert notification preferences
    const { error: prefsError } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, new_events: newEvents, promotions },
        { onConflict: 'user_id' }
      );

    if (prefsError) {
      setMessage('Profile saved, but notification preferences failed.');
      setSaving(false);
      return;
    }

    setMessage('Profile updated.');
    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h1 className="text-2xl font-bold text-white tracking-[0.15em] uppercase mb-8">
        Profile
      </h1>

      {message && (
        <div className="mb-6 p-3 bg-white/5 border border-white/10 text-sm text-gray-300 text-center">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-md">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full bg-white/5 border border-white/10 text-gray-500 px-3 py-2.5 text-sm cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="displayName" className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-1.5">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Your display name"
          />
        </div>

        {/* Notification Preferences */}
        <fieldset className="border border-white/10 p-4">
          <legend className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 px-2">
            Notifications
          </legend>
          <div className="space-y-3 mt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newEvents}
                onChange={(e) => setNewEvents(e.target.checked)}
                className="w-4 h-4 accent-white"
              />
              <span className="text-sm text-gray-300">New event announcements</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={promotions}
                onChange={(e) => setPromotions(e.target.checked)}
                className="w-4 h-4 accent-white"
              />
              <span className="text-sm text-gray-300">Promotions & discounts</span>
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 px-6 text-[10px] font-bold tracking-[0.2em] uppercase border border-white text-white hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </motion.div>
  );
}
