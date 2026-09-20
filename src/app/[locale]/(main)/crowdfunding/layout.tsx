import { SolanaWalletProvider } from "@/domains/crowdfunding/components/solana-wallet-provider";

export default function CrowdfundingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
