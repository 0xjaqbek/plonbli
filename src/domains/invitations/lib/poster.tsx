import path from "path";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Roboto-Regular.woff2") },
    { src: path.join(process.cwd(), "public/fonts/Roboto-Bold.woff2"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 48,
    fontFamily: "Roboto",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1a5c1a",
    fontFamily: "Roboto",
  },
  slogan: {
    fontSize: 17,
    textAlign: "center",
    marginBottom: 14,
    color: "#2d8c2d",
    fontFamily: "Roboto",
  },
  description: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 32,
    color: "#444444",
    lineHeight: 1.6,
    fontFamily: "Roboto",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  scanText: {
    fontSize: 14,
    textAlign: "center",
    color: "#333333",
    marginBottom: 40,
    fontFamily: "Roboto",
  },
  footerName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333333",
    marginBottom: 6,
    fontFamily: "Roboto",
  },
  footerUrl: {
    fontSize: 10,
    textAlign: "center",
    color: "#888888",
    fontFamily: "Roboto",
  },
});

interface InvitationPosterProps {
  userName: string;
  qrDataUrl: string;
  inviteUrl: string;
  logoSrc: string;
}

export function InvitationPoster({ userName, qrDataUrl, inviteUrl, logoSrc }: InvitationPosterProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoContainer}>
          <Image style={styles.logo} src={logoSrc} />
        </View>
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
