import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  tier?: 'basic' | 'premium';
  currentPeriodEnd?: string | null;
}

export default function SubscriptionConfirmation({
  tier = 'premium',
  currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
}: Props) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';
  const renewalFormatted = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const perks = tier === 'premium'
    ? ['Unlimited VOD replays of all past events', 'Discounted PPV pricing on every live event', 'Early access to new events']
    : ['Unlimited VOD replays of all past events', 'Discounted PPV pricing on live events'];

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to Fight Pass {tierLabel} — you&apos;re in</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Fight Pass {tierLabel}</Text>
              <Text style={heading}>Welcome to the team.</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Your subscription is active. Here&apos;s what you get:
              </Text>

              <Section style={perksWrap}>
                {perks.map((perk, i) => (
                  <Text key={i} style={perkRow}>
                    <span style={{ color: '#ffffff', marginRight: '10px' }}>—</span>
                    {perk}
                  </Text>
                ))}
              </Section>

              {renewalFormatted ? (
                <Text style={renewalText}>
                  Renews{' '}
                  <strong style={{ color: '#ffffff' }}>{renewalFormatted}</strong>.
                  Cancel anytime from your account.
                </Text>
              ) : (
                <Text style={renewalText}>
                  Your billing date will appear in your{' '}
                  <Link href="https://boxstreamtv.com/account/subscription" style={{ color: '#9ca3af', textDecoration: 'underline' }}>account settings</Link>.
                  Cancel anytime.
                </Text>
              )}

              <Link href="https://boxstreamtv.com/vod" style={fullButton}>
                START WATCHING →
              </Link>

              <Text style={supportText}>
                Questions?{' '}
                <Link href="mailto:hunter@boxstreamtv.com" style={supportLink}>hunter@boxstreamtv.com</Link>
              </Text>
            </Section>
          </Section>

          <Footer manageLink />
        </Container>
      </Body>
    </Html>
  );
}

function Footer({ manageLink }: { manageLink?: boolean }) {
  return (
    <Text style={footer}>
      © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
      {manageLink && (
        <>
          <Link href="https://boxstreamtv.com/account/subscription" style={footerLink}>Manage</Link>
          &nbsp;·&nbsp;{' '}
        </>
      )}
      <Link href="https://boxstreamtv.com/privacy" style={footerLink}>Privacy</Link>
      &nbsp;·&nbsp;{' '}
      <Link href="https://www.instagram.com/boxstreamtv/" style={footerLink}>Instagram</Link>
    </Text>
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
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 20px' };
const perksWrap: React.CSSProperties = { borderLeft: '2px solid #22c55e', paddingLeft: '20px', marginBottom: '28px' };
const perkRow: React.CSSProperties = { fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 8px' };
const renewalText: React.CSSProperties = { fontSize: '13px', color: '#6b7280', margin: '0 0 28px' };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '24px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
