import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { eventReminderFunction, eventStartingFunction } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [eventReminderFunction, eventStartingFunction],
  serveOrigin: 'https://boxstreamtv.com',
  servePath: '/api/inngest',
});
