import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { eventReminderFunction, eventStartingFunction } from '@/inngest/functions';

const handler = serve({
  client: inngest,
  functions: [eventReminderFunction, eventStartingFunction],
});

export { handler as GET, handler as POST, handler as PUT };
