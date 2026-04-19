import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  tier?: 'basic' | 'premium';
  accessUntil?: string | null;
}

export default function SubscriptionCanceled({
  tier = 'premium',
  accessUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}: Props) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';
  const accessUntilFormatted = accessUntil
    ? new Date(accessUntil).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <Html lang="en">
      <Head />
      <Preview>Your Fight Pass {tierLabel} has been canceled</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Fight Pass {tierLabel}</Text>
              <Text style={heading}>Fight Pass Canceled</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Your Fight Pass {tierLabel} has been canceled.{' '}
                {accessUntilFormatted
                  ? <>You&apos;ll keep full access until <strong style={{ color: '#ffffff' }}>{accessUntilFormatted}</strong>.</>
                  : 'Your access continues until the end of your billing period.'
                }
              </Text>

              {accessUntilFormatted && (
                <Section style={detailsWrap}>
                  <Text style={detailLabel}>Access ends</Text>
                  <Text style={detailValue}>{accessUntilFormatted}</Text>
                </Section>
              )}

              <Link href="https://boxstreamtv.com/vod" style={fullButton}>
                VIEW YOUR CONTENT →
              </Link>

              <Text style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' as const, margin: '0 0 24px' }}>
                Changed your mind?{' '}
                <Link href="https://boxstreamtv.com/pricing" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Rejoin anytime</Link>
              </Text>

              <Text style={supportText}>
                Questions?{' '}
                <Link href="mailto:hunter@boxstreamtv.com" style={supportLink}>hunter@boxstreamtv.com</Link>
              </Text>
            </Section>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/privacy" style={footerLink}>Privacy</Link>
            &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/terms" style={footerLink}>Terms</Link>
            &nbsp;·&nbsp;{' '}
            <Link href="https://www.instagram.com/boxstreamtv/" style={footerLink}>Instagram</Link>
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
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#6b7280', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };
const detailsWrap: React.CSSProperties = { borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '20px', marginBottom: '32px' };
const detailLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' };
const detailValue: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '24px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
