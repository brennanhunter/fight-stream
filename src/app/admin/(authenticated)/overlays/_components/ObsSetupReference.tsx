import { AlertCircle, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminCopyButton from '../../../AdminCopyButton';

const OVERLAY_PATHS: { label: string; path: string; built: boolean }[] = [
  { label: 'Lower Third', path: '/overlays/lower-third', built: true },
  { label: 'Boxer Card', path: '/overlays/boxer-card', built: true },
  { label: 'Tale of the Tape', path: '/overlays/tale-of-the-tape', built: true },
  { label: 'Round Timer', path: '/overlays/round-timer', built: true },
  { label: 'BoxStream Logo', path: '/overlays/logo', built: true },
  { label: 'Promoter Logo', path: '/overlays/promoter-logo', built: true },
];

export default function ObsSetupReference() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://boxstreamtv.com';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" />
          OBS Browser Source Setup
        </CardTitle>
        <CardDescription>
          One browser source per overlay type. Add each URL as its own source in your scene. The
          page is invisible until /control turns it on — that&rsquo;s expected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">URLs (built sources are live)</p>
          <ul className="divide-y divide-border rounded-md border">
            {OVERLAY_PATHS.map((o) => {
              const fullUrl = `${baseUrl}${o.path}`;
              return (
                <li
                  key={o.path}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {o.label}
                      {!o.built && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          coming soon
                        </span>
                      )}
                    </p>
                    <code className="block truncate text-xs font-mono text-muted-foreground">
                      {fullUrl}
                    </code>
                  </div>
                  {o.built && <AdminCopyButton url={fullUrl} />}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">Width × Height</p>
            <p className="font-mono text-sm font-medium">1920 × 1080</p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">Shutdown when not visible</p>
            <p className="text-sm font-medium text-red-400">OFF</p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">Custom CSS</p>
            <p className="text-sm font-medium">leave default</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p>
            Keep <strong>Shutdown source when not visible</strong> turned <strong>OFF</strong>.
            If on, OBS kills the Realtime connection every scene swap and updates will lag.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
