"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { WalletButton } from "@/domains/crowdfunding/components/wallet-button";
import {
  PLATFORM_FEE_BASIS_POINTS,
  usePlatformBootstrap,
} from "@/domains/crowdfunding/hooks/use-platform-bootstrap";
import {
  CROWDFUNDING_PROGRAM_ID,
  PLATFORM_ADMIN_ADDRESS,
  SOLANA_NETWORK,
  SOLANA_RPC_URL,
} from "@/domains/crowdfunding/lib/constants";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export default function PlatformBootstrapPage() {
  const {
    canSimulate,
    canSubmit,
    error,
    failedSimulationLogs,
    inspection,
    isAdminConfigured,
    isDevnet,
    isExpectedWallet,
    isInspecting,
    isPhantom,
    isSimulating,
    isSubmitting,
    platformPda,
    refresh,
    simulate,
    simulation,
    submit,
    submission,
    walletAddress,
  } = usePlatformBootstrap();

  const visibleLogs = simulation?.logs ?? failedSimulationLogs;
  const walletReady = !!walletAddress && isExpectedWallet && isPhantom;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Jednorazowa inicjalizacja
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bootstrap platformy crowdfundingowej
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Ta strona najpierw symuluje instrukcję bez zmiany stanu. Dopiero
            osobny przycisk otworzy Phantom i pozwoli podpisać transakcję
            tworzącą Platform PDA.
          </p>
        </div>
        <WalletButton />
      </div>

      <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Operacja uprzywilejowana</p>
          <p className="mt-1">
            Pierwszy poprawny inicjalizator zostaje administratorem programu.
            Strona akceptuje wyłącznie skonfigurowany adres Phantom i devnet.
            Seed ani klucz prywatny nie są tu potrzebne.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle>Kontrole bezpieczeństwa</CardTitle>
                <CardDescription>
                  Wszystkie kontrole muszą przejść przed symulacją.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
                disabled={isInspecting || isSimulating || isSubmitting}
              >
                <RefreshCw className={isInspecting ? "animate-spin" : ""} />
                Odśwież
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="font-medium">Sieć</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {SOLANA_NETWORK} · {SOLANA_RPC_URL}
                </p>
              </div>
              <Badge variant={isDevnet ? "secondary" : "destructive"}>
                {isDevnet ? "Devnet" : "Zablokowano"}
              </Badge>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium">Phantom administratora</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {walletAddress ?? "Portfel niepołączony"}
                </p>
                {walletAddress && !isPhantom ? (
                  <p className="mt-1 text-xs text-destructive">
                    Wybrany adapter nie jest Phantom.
                  </p>
                ) : null}
                {walletAddress && !isExpectedWallet ? (
                  <p className="mt-1 text-xs text-destructive">
                    Adres nie odpowiada NEXT_PUBLIC_PLATFORM_ADMIN.
                  </p>
                ) : null}
              </div>
              <Badge variant={walletReady ? "secondary" : "outline"}>
                {walletReady ? "Zgodny" : "Wymagany"}
              </Badge>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium">Program na devnet</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {CROWDFUNDING_PROGRAM_ID.toBase58()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isInspecting
                    ? "Sprawdzanie konta programu…"
                    : inspection?.programMessage ?? "Brak wyniku kontroli."}
                </p>
              </div>
              <Badge
                variant={
                  inspection?.programStatus === "ready"
                    ? "secondary"
                    : inspection?.programStatus === "invalid"
                      ? "destructive"
                      : "outline"
                }
              >
                {isInspecting
                  ? "Sprawdzam"
                  : inspection?.programStatus === "ready"
                    ? "Gotowy"
                    : inspection?.programStatus === "missing"
                      ? "Oczekuje na deploy"
                      : "Nieprawidłowy"}
              </Badge>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium">Platform PDA</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {platformPda}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isInspecting
                    ? "Sprawdzanie konta platformy…"
                    : inspection?.platformMessage ?? "Brak wyniku kontroli."}
                </p>
              </div>
              <Badge
                variant={
                  inspection?.platformStatus === "missing"
                    ? "secondary"
                    : inspection?.platformStatus === "invalid"
                      ? "destructive"
                      : "outline"
                }
              >
                {isInspecting
                  ? "Sprawdzam"
                  : inspection?.platformStatus === "missing"
                    ? "Wolne"
                    : inspection?.platformStatus === "initialized"
                      ? "Zainicjalizowane"
                      : "Nieprawidłowe"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parametry inicjalizacji</CardTitle>
            <CardDescription>
              Wartości zapisane w Platform PDA po podpisaniu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Cluster</dt>
                <dd className="mt-1 font-medium">devnet</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Admin</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {PLATFORM_ADMIN_ADDRESS || "Brak konfiguracji"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Treasury</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {walletAddress ??
                    (PLATFORM_ADMIN_ADDRESS || "Połącz Phantom")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Opłata platformy</dt>
                <dd className="mt-1 font-medium">
                  {PLATFORM_FEE_BASIS_POINTS} bps = 2,5%
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Platform PDA</dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {platformPda}
                </dd>
              </div>
            </dl>

            {!isAdminConfigured ? (
              <p className="mt-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                Ustaw poprawne NEXT_PUBLIC_PLATFORM_ADMIN przed użyciem tej
                strony.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Symulacja</CardTitle>
          <CardDescription>
            Symulacja wykonuje instrukcję w RPC, ale nie zapisuje zmian w
            blockchainie i nie wysyła transakcji.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void simulate()}
            disabled={!canSimulate}
            isLoading={isSimulating}
          >
            <FlaskConical />
            Symuluj initialize_platform
          </Button>

          {simulation ? (
            <div className="flex gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Symulacja zakończona sukcesem</p>
                <p className="mt-1">
                  Wynik dotyczy portfela {shortAddress(simulation.walletAddress)}.
                  Możesz przejść do osobnego podpisu.
                </p>
              </div>
            </div>
          ) : null}

          {visibleLogs.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Logi symulacji</p>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                {visibleLogs.slice(0, 100).join("\n")}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Podpis i wysłanie</CardTitle>
          <CardDescription>
            Przycisk odblokuje się wyłącznie po udanej symulacji dla aktualnie
            połączonego adresu. Phantom pokaże ostateczne okno podpisu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            isLoading={isSubmitting}
          >
            <Send />
            Podpisz i wyślij
          </Button>

          {error ? (
            <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <XCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Operacja nie jest gotowa</p>
                <p className="mt-1 break-words">{error}</p>
              </div>
            </div>
          ) : null}

          {submission ? (
            <div className="space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Platform PDA zostało utworzone i zweryfikowane
                  </p>
                  <a
                    href={`https://explorer.solana.com/tx/${submission.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    Zobacz transakcję w Solana Explorer
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <dl className="grid gap-2 border-t border-emerald-300 pt-3 font-mono text-xs dark:border-emerald-900">
                <div className="break-all">
                  admin = {submission.platformConfig.admin}
                </div>
                <div className="break-all">
                  treasury = {submission.platformConfig.treasury}
                </div>
                <div>
                  fee_basis_points = {submission.platformConfig.feeBasisPoints}
                </div>
              </dl>
            </div>
          ) : null}

          {inspection?.platformConfig && !submission ? (
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-semibold">Aktualna konfiguracja onchain</p>
              <dl className="mt-3 grid gap-2 font-mono text-xs">
                <div className="break-all">
                  admin = {inspection.platformConfig.admin}
                </div>
                <div className="break-all">
                  treasury = {inspection.platformConfig.treasury}
                </div>
                <div>
                  fee_basis_points = {inspection.platformConfig.feeBasisPoints}
                </div>
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
