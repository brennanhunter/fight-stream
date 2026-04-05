import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  tier?: 'basic' | 'premium';
  amountPaid?: string;
  nextRenewal?: string | null;
}

export default function SubscriptionRenewed({
  tier = 'premium',
  amountPaid = '$9.99',
  nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}: Props) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';
  const nextFormatted = nextRenewal
    ? new Date(nextRenewal).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Html lang="en">
      <Head />
      <Preview>Fight Pass {tierLabel} renewed — you&apos;re good for another month</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Fight Pass {tierLabel}</Text>
              <Text style={heading}>Subscription Renewed</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Your Fight Pass {tierLabel} has been renewed. You&apos;re all set for another month.
              </Text>

              <Section style={detailsBox}>
                <Section style={detailRow}>
                  <Text style={detailLabel}>Plan</Text>
                  <Text style={detailValue}>Fight Pass {tierLabel}</Text>
                </Section>
                <Section style={detailRow}>
                  <Text style={detailLabel}>Amount Charged</Text>
                  <Text style={detailValue}>{amountPaid}</Text>
                </Section>
                {nextFormatted && (
                  <Section style={{ ...detailRow, borderBottom: 'none' }}>
                    <Text style={detailLabel}>Next Renewal</Text>
                    <Text style={detailValue}>{nextFormatted}</Text>
                  </Section>
                )}
              </Section>

              <Link href="https://boxstreamtv.com/vod" style={fullButton}>
                WATCH NOW →
              </Link>

              <Text style={supportText}>
                Manage your subscription &mdash;{' '}
                <Link href="https://boxstreamtv.com/account/subscription" style={supportLink}>
                  Account Settings
                </Link>
              </Text>
            </Section>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/account/subscription" style={footerLink}>Manage</Link>
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
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#22c55e', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#22c55e', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };
const detailsBox: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', marginBottom: '28px' };
const detailRow: React.CSSProperties = { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const detailLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' };
const detailValue: React.CSSProperties = { fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: 0 };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '24px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
