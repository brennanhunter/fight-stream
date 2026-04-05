import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr, Row, Column,
} from '@react-email/components';

export default function Welcome() {
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to BoxStreamTV — your ringside seat awaits</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Welcome</Text>
              <Text style={heading}>You&apos;re in.</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Welcome to BoxStreamTV &mdash; live independent boxing, PPV events, and a growing
                library of fight replays. All in your browser, no app required.
              </Text>

              <Section style={perksWrap}>
                {[
                  'Watch live PPV events from your browser',
                  'Stream full event replays on demand',
                  'Fight Pass unlocks the whole library',
                ].map((perk, i) => (
                  <Text key={i} style={perkRow}>
                    <span style={{ color: '#ffffff', marginRight: '10px' }}>—</span>
                    {perk}
                  </Text>
                ))}
              </Section>

              <Row style={{ marginBottom: '24px' }}>
                <Column style={{ paddingRight: '8px' }}>
                  <Link href="https://boxstreamtv.com/vod" style={primaryButton}>
                    BROWSE VOD →
                  </Link>
                </Column>
                <Column style={{ paddingLeft: '8px' }}>
                  <Link href="https://boxstreamtv.com/pricing" style={secondaryButton}>
                    GET FIGHT PASS
                  </Link>
                </Column>
              </Row>

              <Text style={supportText}>
                Questions?{' '}
                <Link href="mailto:hunter@boxstreamtv.com" style={supportLink}>hunter@boxstreamtv.com</Link>
              </Text>
            </Section>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
            <Link href="https://boxstreamtv.com/account" style={footerLink}>My Account</Link>
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
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#ffffff', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 20px' };
const perksWrap: React.CSSProperties = { borderLeft: '2px solid #ffffff', paddingLeft: '20px', marginBottom: '28px' };
const perkRow: React.CSSProperties = { fontSize: '14px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 8px' };
const primaryButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '14px', textAlign: 'center' };
const secondaryButton: React.CSSProperties = { display: 'block', backgroundColor: 'transparent', color: '#ffffff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.3)' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
