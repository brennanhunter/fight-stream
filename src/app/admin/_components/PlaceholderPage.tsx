export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground">
        Admin
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      <div className="mt-8 rounded-md border border-dashed border-muted-foreground/30 p-6 text-sm text-muted-foreground">
        This section is being migrated. Use{' '}
        <a href="/admin/legacy" className="underline underline-offset-2 hover:text-foreground">
          the legacy panel
        </a>{' '}
        in the meantime.
      </div>
    </div>
  );
}
