import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  eventName?: string;
  expiresAt?: string;
  amountPaid?: number;
}

export default function PurchaseConfirmation({
  eventName = 'Fight Night',
  expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  amountPaid = 4999,
}: Props) {
  const expiryFormatted = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const amountFormatted = amountPaid > 0
    ? `$${(amountPaid / 100).toFixed(2)}`
    : 'Free (promo applied)';

  return (
    <Html lang="en">
      <Head />
      <Preview>You&apos;re in — {eventName} access confirmed</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Logo */}
          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          {/* Card */}
          <Section style={card}>
            {/* Green accent stripe */}
            <div style={accentStripe('#22c55e')} />

            <Section style={cardBody}>
              <Text style={statusLabel('#22c55e')}>Purchase Confirmed</Text>
              <Text style={eventTitle}>{eventName}</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Your access is locked in. Head to BoxStreamTV when the fight starts — you&apos;re all set.
              </Text>

              {/* Details */}
              <Section style={detailsWrap}>
                <DetailRow label="Event" value={eventName} />
                <DetailRow label="Access Until" value={expiryFormatted} />
                <DetailRow label="Amount Paid" value={amountFormatted} last />
              </Section>

              {/* CTA */}
              <Link href="https://boxstreamtv.com" style={fullButton}>
                WATCH NOW →
              </Link>

              <Text style={supportText}>
                Having trouble?{' '}
                <Link href="mailto:hunter@boxstreamtv.com" style={supportLink}>hunter@boxstreamtv.com</Link>
              </Text>
            </Section>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ ...detailRow, ...(last ? {} : { borderBottom: '1px solid rgba(255,255,255,0.06)' }) }}>
      <Text style={detailLabel}>{label}</Text>
      <Text style={detailValue}>{value}</Text>
    </div>
  );
}

function Footer() {
  return (
    <Text style={footer}>
      © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
      <Link href="https://boxstreamtv.com/privacy" style={footerLink}>Privacy</Link>
      &nbsp;·&nbsp;{' '}
      <Link href="https://boxstreamtv.com/terms" style={footerLink}>Terms</Link>
      &nbsp;·&nbsp;{' '}
      <Link href="https://www.instagram.com/boxstreamtv/" style={footerLink}>Instagram</Link>
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#000000', margin: 0, padding: 0,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 16px' };
const logoSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '28px' };
const card: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const cardBody: React.CSSProperties = { padding: '36px 36px 40px' };

const accentStripe = (color: string): React.CSSProperties => ({
  height: '3px', backgroundColor: color, display: 'block',
});

const statusLabel = (color: string): React.CSSProperties => ({
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em',
  textTransform: 'uppercase', color, margin: '0 0 12px',
});

const eventTitle: React.CSSProperties = {
  fontSize: '28px', fontWeight: 700, color: '#ffffff',
  letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px',
};
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };

const detailsWrap: React.CSSProperties = {
  borderLeft: '2px solid rgba(255,255,255,0.15)', paddingLeft: '20px', marginBottom: '32px',
};
const detailRow: React.CSSProperties = { paddingBottom: '16px', marginBottom: '16px' };
const detailLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em',
  textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px',
};
const detailValue: React.CSSProperties = { fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: 0 };

const fullButton: React.CSSProperties = {
  display: 'block', backgroundColor: '#ffffff', color: '#000000',
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em',
  textTransform: 'uppercase', textDecoration: 'none',
  padding: '16px', textAlign: 'center', marginBottom: '24px',
};

const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
