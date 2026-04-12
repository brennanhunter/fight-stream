import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { eventReminderFunction, eventStartingFunction, eventAnnounceFunction, ppvSurveyFunction, vodSurveyFunction } from '@/inngest/functions';

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [eventReminderFunction, eventStartingFunction, eventAnnounceFunction, ppvSurveyFunction, vodSurveyFunction],
});
