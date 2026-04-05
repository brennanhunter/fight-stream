import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  eventName?: string;
  code?: string;
}

export default function RecoveryCode({
  eventName = 'Fight Night',
  code = '847291',
}: Props) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your BoxStreamTV access code: {code}</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>Access Recovery</Text>
              <Text style={heading}>Your Access Code</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Enter this code to restore your access to{' '}
                <strong style={{ color: '#ffffff' }}>{eventName}</strong>.
              </Text>

              {/* Big code display */}
              <Section style={codeWrap}>
                <Text style={codeDigits}>{code}</Text>
                <Text style={codeExpiry}>Expires in 15 minutes</Text>
              </Section>

              <Text style={securityNote}>
                Didn&apos;t request this? Ignore this email — your access is safe.
              </Text>

              <Text style={supportText}>
                Need help?{' '}
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

function Footer() {
  return (
    <Text style={footer}>
      © {new Date().getFullYear()} BoxStreamTV &nbsp;·&nbsp;{' '}
      <Link href="https://boxstreamtv.com/privacy" style={footerLink}>Privacy</Link>
      &nbsp;·&nbsp;{' '}
      <Link href="https://boxstreamtv.com/terms" style={footerLink}>Terms</Link>
    </Text>
  );
}

const body: React.CSSProperties = { backgroundColor: '#000000', margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 16px' };
const logoSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '28px' };
const card: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const cardBody: React.CSSProperties = { padding: '36px 36px 40px' };
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#ffffff', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 32px' };
const codeWrap: React.CSSProperties = { backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.15)', padding: '32px 20px', textAlign: 'center', marginBottom: '28px' };
const codeDigits: React.CSSProperties = { fontSize: '48px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.4em', margin: '0 0 8px', fontVariantNumeric: 'tabular-nums' };
const codeExpiry: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: 0 };
const securityNote: React.CSSProperties = { fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: '0 0 8px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
