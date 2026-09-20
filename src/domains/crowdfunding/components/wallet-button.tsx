"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Wallet, LogOut, Copy, Check } from "lucide-react";
import { useState } from "react";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const t = useTranslations("crowdfunding.wallet");
  const [copied, setCopied] = useState(false);

  if (!connected || !publicKey) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setVisible(true)}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {t("connect")}
      </Button>
    );
  }

  const address = publicKey.toBase58();
  const short = `${address.slice(0, 4)}...${address.slice(-4)}`;

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm">
        <Wallet className="h-3.5 w-3.5 text-green-600" />
        <code className="text-xs">{short}</code>
        <button
          onClick={handleCopy}
          className="ml-1 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => disconnect()}
        title={t("disconnect")}
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
