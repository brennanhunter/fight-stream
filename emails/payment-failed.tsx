import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  tier?: 'basic' | 'premium';
  nextRetryDate?: string | null;
}

export default function PaymentFailed({
  tier = 'premium',
  nextRetryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
}: Props) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';
  const retryFormatted = nextRetryDate
    ? new Date(nextRetryDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Html lang="en">
      <Head />
      <Preview>Action required — payment failed for your Fight Pass</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Action Required</Text>
              <Text style={heading}>Payment Failed</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                We couldn&apos;t charge your card for Fight Pass {tierLabel}.
                Your access is still active — update your payment method before the next retry to keep it.
              </Text>

              {retryFormatted && (
                <Section style={detailsWrap}>
                  <Text style={detailLabel}>Next retry</Text>
                  <Text style={detailValue}>{retryFormatted}</Text>
                </Section>
              )}

              <Link href="https://boxstreamtv.com/account/subscription" style={fullButton}>
                UPDATE PAYMENT METHOD →
              </Link>

              <Text style={supportText}>
                Need help?{' '}
                <Link href="mailto:hunter@boxstreamtv.com" style={supportLink}>hunter@boxstreamtv.com</Link>
              </Text>
            </Section>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/account/subscription" style={footerLink}>Manage Subscription</Link>
            &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/privacy" style={footerLink}>Privacy</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = { backgroundColor: '#000000', margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 16px' };
const logoSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '28px' };
const card: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const cardBody: React.CSSProperties = { padding: '36px 36px 40px' };
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#ef4444', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };
const detailsWrap: React.CSSProperties = { borderLeft: '2px solid #ef4444', paddingLeft: '20px', marginBottom: '32px' };
const detailLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' };
const detailValue: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ef4444', color: '#ffffff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '24px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
