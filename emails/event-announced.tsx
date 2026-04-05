import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text, Hr,
} from '@react-email/components';

interface Props {
  eventName?: string;
  eventDate?: string;
  ppvPrice?: string;
}

export default function EventAnnounced({
  eventName = 'Alvarez vs. Martinez',
  eventDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  ppvPrice = '$14.99',
}: Props) {
  const dateFormatted = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <Html lang="en">
      <Head />
      <Preview>{eventName} is coming to BoxStreamTV — watch live</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={logoSection}>
            <Img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width={64} height={64} />
          </Section>

          <Section style={card}>
            <div style={accentStripe} />
            <Section style={cardBody}>
              <Text style={statusLabel}>New Event</Text>
              <Text style={heading}>{eventName}</Text>
              <Hr style={divider} />

              <Text style={bodyText}>
                A new live event is coming to BoxStreamTV. Mark your calendar and secure your access now.
              </Text>

              <Section style={detailsWrap}>
                <Text style={detailLabel}>Date</Text>
                <Text style={detailValue}>{dateFormatted}</Text>
                <Text style={{ ...detailLabel, marginTop: '16px' }}>PPV Price</Text>
                <Text style={detailValue}>{ppvPrice}</Text>
              </Section>

              <Section style={fightPassNote}>
                <Text style={noteText}>
                  <strong style={{ color: '#ffffff' }}>Fight Pass Premium?</strong>{' '}
                  This event is included at no extra cost. Fight Pass Basic gets 25% off.{' '}
                  <Link href="https://boxstreamtv.com/pricing" style={noteLink}>View plans →</Link>
                </Text>
              </Section>

              <Link href="https://boxstreamtv.com/" style={fullButton}>
                GET ACCESS →
              </Link>

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
const accentStripe: React.CSSProperties = { height: '3px', backgroundColor: '#ef4444', display: 'block' };
const statusLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 12px' };
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2', margin: '0 0 8px' };
const divider: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0 24px' };
const bodyText: React.CSSProperties = { fontSize: '15px', color: '#9ca3af', lineHeight: '1.6', margin: '0 0 28px' };
const detailsWrap: React.CSSProperties = { borderLeft: '2px solid #ef4444', paddingLeft: '20px', marginBottom: '28px' };
const detailLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 4px' };
const detailValue: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 };
const fightPassNote: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', marginBottom: '28px' };
const noteText: React.CSSProperties = { fontSize: '13px', color: '#9ca3af', lineHeight: '1.6', margin: 0 };
const noteLink: React.CSSProperties = { color: '#9ca3af' };
const fullButton: React.CSSProperties = { display: 'block', backgroundColor: '#ffffff', color: '#000000', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', padding: '16px', textAlign: 'center', marginBottom: '24px' };
const supportText: React.CSSProperties = { fontSize: '12px', color: '#4b5563', textAlign: 'center', margin: 0 };
const supportLink: React.CSSProperties = { color: '#6b7280' };
const footer: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#374151', paddingTop: '24px', margin: 0 };
const footerLink: React.CSSProperties = { color: '#374151', textDecoration: 'none' };
