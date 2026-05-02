'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { setEventPromoterLogo } from '../actions';
import PhotoUploader from './PhotoUploader';

export default function PromoterLogoInput({
  eventId,
  initialUrl,
}: {
  eventId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Promoter Logo</CardTitle>
        <CardDescription>
          Drop or upload the promoter&rsquo;s logo. The live <code>/control</code> panel toggles
          this on/off, and it appears in the bottom-left of the broadcast next to the round timer.
          Saves automatically once uploaded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PhotoUploader
          value={url}
          onChange={setUrl}
          displayName="Promoter logo"
          kind="logo"
          onAutoSave={(newUrl) => setEventPromoterLogo(eventId, newUrl)}
        />
      </CardContent>
    </Card>
  );
}
