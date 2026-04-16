import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 48,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1a5c1a",
  },
  slogan: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
    color: "#2d8c2d",
    fontFamily: "Helvetica-Oblique",
  },
  description: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 40,
    color: "#444444",
    lineHeight: 1.6,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrCode: {
    width: 220,
    height: 220,
  },
  scanText: {
    fontSize: 15,
    textAlign: "center",
    color: "#333333",
    marginBottom: 48,
  },
  footerName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333333",
    marginBottom: 6,
  },
  footerUrl: {
    fontSize: 10,
    textAlign: "center",
    color: "#888888",
  },
});

interface InvitationPosterProps {
  userName: string;
  qrDataUrl: string;
  inviteUrl: string;
}

export function InvitationPoster({ userName, qrDataUrl, inviteUrl }: InvitationPosterProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Plonbli</Text>
        <Text style={styles.slogan}>Kupuj lokalnie. Wspieraj rolników.</Text>
        <Text style={styles.description}>
          Plonbli to platforma łącząca lokalnych rolników z konsumentami.{"\n"}
          Kupuj świeże produkty prosto od rolnika — bez pośredników.{"\n"}
          Dołącz do społeczności i wspieraj lokalną gospodarkę.
        </Text>
        <View style={styles.qrContainer}>
          <Image style={styles.qrCode} src={qrDataUrl} />
        </View>
        <Text style={styles.scanText}>Zeskanuj, żeby dołączyć</Text>
        <Text style={styles.footerName}>Zaproszenie od: {userName}</Text>
        <Text style={styles.footerUrl}>{inviteUrl}</Text>
      </Page>
    </Document>
  );
}
