import { SolanaWalletProvider } from "@/domains/crowdfunding/components/solana-wallet-provider";
import { CrowdfundingNav } from "@/domains/crowdfunding/components/crowdfunding-nav";

export default function CrowdfundingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SolanaWalletProvider>
      <CrowdfundingNav />
      {children}
    </SolanaWalletProvider>
  );
}
