import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  eventName?: string;
  eventDate?: string;
}

export default function EventReminder({
  eventName = 'Fight Night',
  eventDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}: Props) {
  const dateFormatted = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeFormatted = new Date(eventDate).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });

  return (
    <Html lang="en">
      <Head />
      <Preview>{eventName} is tomorrow — don&apos;t miss it</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={reminderLabel}>Tomorrow Night</Text>
              <Text style={eventTitle}>{eventName}</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                Your fight is tomorrow. Make sure you&apos;re ready — access starts at the bell.
              </Text>

              <Section style={detailsWrap}>
                <div style={detailRow}>
                  <Text style={detailLabel}>Date</Text>
                  <Text style={detailValue}>{dateFormatted}</Text>
                </div>
                <div style={{ ...detailRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <Text style={detailLabel}>Time</Text>
                  <Text style={detailValue}>{timeFormatted}</Text>
                </div>
              </Section>

              <Link href="https://boxstreamtv.com" style={fullButton}>
                WATCH TOMORROW →
              </Link>

              <Text style={replayNote}>
                Can&apos;t watch live? The replay will be available after the event.
              </Text>

              <Text style={supportText}>
                Questions?{' '}
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
      <Link href="https://www.instagram.com/boxstreamtv/" style={footerLink}>Instagram</Link>
    </Text>
  );
}

const body: React.CSSProperties = { backgroundColor: '#000000', margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '40px 16px' };
const logoSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '28px' };
const card: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' };
const cardBody: React.CSSProperties = { padding: '36px 36px 40px' };
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#f59e0b', display: 'block' };
const reminderLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 12px' };
const eventTitle: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };
const detailsWrap: React.CSSProperties = { borderLeft: '2px solid #f59e0b', paddingLeft: '20px', marginBottom: '32px' };
const detailRow: React.CSSProperties = { paddingBottom: '16px' };
const detailLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' };
const detailValue: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '20px' };
const replayNote: React.CSSProperties = { fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: '0 0 8px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
