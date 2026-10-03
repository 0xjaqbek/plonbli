"use client";

import { useCallback, useEffect, useState } from "react";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  CROWDFUNDING_PROGRAM_ID,
  PLATFORM_ADMIN_ADDRESS,
  SOLANA_NETWORK,
} from "../lib/constants";
import { findPlatformConfigPda } from "../lib/pda";
import { getProgram } from "../lib/program";

const BPF_UPGRADEABLE_LOADER_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);
const PLATFORM_CONFIG_ACCOUNT_SIZE = 8 + 32 + 2 + 32 + 1;
const PLATFORM_CONFIG_PDA = findPlatformConfigPda();
export const PLATFORM_FEE_BASIS_POINTS = 250;

type ProgramStatus = "ready" | "missing" | "invalid";
type PlatformStatus = "missing" | "initialized" | "invalid";

export interface PlatformConfigSnapshot {
  admin: string;
  treasury: string;
  feeBasisPoints: number;
}

export interface BootstrapInspection {
  programStatus: ProgramStatus;
  programMessage: string;
  platformStatus: PlatformStatus;
  platformMessage: string;
  platformConfig: PlatformConfigSnapshot | null;
}

interface SimulationResult {
  walletAddress: string;
  logs: string[];
  simulatedAt: string;
}

interface SubmissionResult {
  signature: string;
  platformConfig: PlatformConfigSnapshot;
}

interface DecodedPlatformConfig {
  admin: PublicKey;
  treasury: PublicKey;
  feeBasisPoints: number;
}

const platformDiscriminator =
  BorshAccountsCoder.accountDiscriminator("PlatformConfig");

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return "Nieznany błąd operacji Solana.";
}

function simulationLogs(cause: unknown): string[] {
  if (
    cause &&
    typeof cause === "object" &&
    "simulationResponse" in cause
  ) {
    const response = cause.simulationResponse;
    if (
      response &&
      typeof response === "object" &&
      "logs" in response &&
      Array.isArray(response.logs)
    ) {
      return response.logs.filter(
        (entry): entry is string => typeof entry === "string"
      );
    }
  }
  return [];
}

export function usePlatformBootstrap() {
  const wallet = useAnchorWallet();
  const { wallet: selectedWallet } = useWallet();
  const { connection } = useConnection();
  const [inspection, setInspection] = useState<BootstrapInspection | null>(
    null
  );
  const [isInspecting, setIsInspecting] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [failedSimulationLogs, setFailedSimulationLogs] = useState<string[]>(
    []
  );
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  const platformPda = PLATFORM_CONFIG_PDA;
  const walletAddress = wallet?.publicKey.toBase58() ?? null;
  const isPhantom = selectedWallet?.adapter.name === "Phantom";
  const isExpectedWallet =
    !!walletAddress && walletAddress === PLATFORM_ADMIN_ADDRESS;
  const isDevnet = SOLANA_NETWORK === "devnet";
  const isAdminConfigured = (() => {
    try {
      return (
        !!PLATFORM_ADMIN_ADDRESS &&
        new PublicKey(PLATFORM_ADMIN_ADDRESS).toBase58() ===
          PLATFORM_ADMIN_ADDRESS
      );
    } catch {
      return false;
    }
  })();

  const inspect = useCallback(async (): Promise<BootstrapInspection> => {
    const [programAccount, platformAccount] = await connection.getMultipleAccountsInfo(
      [CROWDFUNDING_PROGRAM_ID, platformPda],
      "confirmed"
    );

    let programStatus: ProgramStatus = "ready";
    let programMessage = "Program istnieje, jest wykonywalny i ma poprawnego właściciela.";

    if (!programAccount) {
      programStatus = "missing";
      programMessage = "Program nie został jeszcze wdrożony na wybranym klastrze.";
    } else if (
      !programAccount.executable ||
      !programAccount.owner.equals(BPF_UPGRADEABLE_LOADER_ID)
    ) {
      programStatus = "invalid";
      programMessage =
        "Konto programu istnieje, ale nie jest wykonywalnym programem upgradeable BPF.";
    }

    if (!platformAccount) {
      return {
        programStatus,
        programMessage,
        platformStatus: "missing",
        platformMessage: "Platform PDA nie istnieje i może zostać zainicjalizowane.",
        platformConfig: null,
      };
    }

    if (!platformAccount.owner.equals(CROWDFUNDING_PROGRAM_ID)) {
      return {
        programStatus,
        programMessage,
        platformStatus: "invalid",
        platformMessage: "Platform PDA ma nieprawidłowego właściciela.",
        platformConfig: null,
      };
    }

    if (
      platformAccount.data.length !== PLATFORM_CONFIG_ACCOUNT_SIZE ||
      !platformAccount.data.subarray(0, 8).equals(platformDiscriminator)
    ) {
      return {
        programStatus,
        programMessage,
        platformStatus: "invalid",
        platformMessage:
          "Platform PDA ma nieprawidłowy rozmiar lub discriminator konta.",
        platformConfig: null,
      };
    }

    const program = wallet ? getProgram(wallet) : null;
    if (!program) {
      return {
        programStatus,
        programMessage,
        platformStatus: "initialized",
        platformMessage:
          "Platform PDA istnieje. Połącz portfel, aby odczytać pełną konfigurację.",
        platformConfig: null,
      };
    }

    const decoded = (await program.account.platformConfig.fetch(
      platformPda
    )) as unknown as DecodedPlatformConfig;

    return {
      programStatus,
      programMessage,
      platformStatus: "initialized",
      platformMessage: "Platforma jest już zainicjalizowana.",
      platformConfig: {
        admin: decoded.admin.toBase58(),
        treasury: decoded.treasury.toBase58(),
        feeBasisPoints: decoded.feeBasisPoints,
      },
    };
  }, [connection, platformPda, wallet]);

  const refresh = useCallback(async () => {
    setIsInspecting(true);
    setError(null);
    try {
      const nextInspection = await inspect();
      setInspection(nextInspection);
      return nextInspection;
    } catch (cause) {
      setError(errorMessage(cause));
      setInspection(null);
      return null;
    } finally {
      setIsInspecting(false);
    }
  }, [inspect]);

  useEffect(() => {
    let active = true;
    setIsInspecting(true);
    inspect()
      .then((nextInspection) => {
        if (active) {
          setInspection(nextInspection);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setInspection(null);
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (active) setIsInspecting(false);
      });
    return () => {
      active = false;
    };
  }, [inspect]);

  const assertReady = useCallback(
    (currentInspection: BootstrapInspection | null) => {
      if (!isDevnet) throw new Error("Bootstrap jest dozwolony wyłącznie na devnet.");
      if (!isAdminConfigured) {
        throw new Error("NEXT_PUBLIC_PLATFORM_ADMIN nie zawiera poprawnego adresu.");
      }
      if (!wallet) throw new Error("Najpierw połącz Phantom.");
      if (!isPhantom) throw new Error("Do bootstrapu wybierz portfel Phantom.");
      if (!isExpectedWallet) {
        throw new Error("Połączony portfel nie jest skonfigurowanym administratorem.");
      }
      if (currentInspection?.programStatus !== "ready") {
        throw new Error("Program nie jest gotowy na devnet.");
      }
      if (currentInspection.platformStatus !== "missing") {
        throw new Error("Platform PDA już istnieje albo nie przeszło walidacji.");
      }
    },
    [isAdminConfigured, isDevnet, isExpectedWallet, isPhantom, wallet]
  );

  const simulate = useCallback(async () => {
    setIsSimulating(true);
    setError(null);
    setSimulation(null);
    setFailedSimulationLogs([]);
    setSubmission(null);
    try {
      const currentInspection = await inspect();
      setInspection(currentInspection);
      assertReady(currentInspection);
      if (!wallet) throw new Error("Najpierw połącz Phantom.");

      const program = getProgram(wallet);
      const result = await program.methods
        .initializePlatform(PLATFORM_FEE_BASIS_POINTS)
        .accounts({
          platformConfig: platformPda,
          admin: wallet.publicKey,
          treasury: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .simulate();

      setSimulation({
        walletAddress: wallet.publicKey.toBase58(),
        logs: [...result.raw],
        simulatedAt: new Date().toISOString(),
      });
    } catch (cause) {
      setFailedSimulationLogs(simulationLogs(cause));
      setError(errorMessage(cause));
    } finally {
      setIsSimulating(false);
    }
  }, [assertReady, inspect, platformPda, wallet]);

  const submit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setSubmission(null);
    try {
      if (!wallet || simulation?.walletAddress !== wallet.publicKey.toBase58()) {
        throw new Error("Wymagana jest aktualna, poprawna symulacja dla tego portfela.");
      }

      const currentInspection = await inspect();
      setInspection(currentInspection);
      assertReady(currentInspection);

      const program = getProgram(wallet);
      const signature = await program.methods
        .initializePlatform(PLATFORM_FEE_BASIS_POINTS)
        .accounts({
          platformConfig: platformPda,
          admin: wallet.publicKey,
          treasury: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const verifiedInspection = await inspect();
      setInspection(verifiedInspection);
      if (
        verifiedInspection.platformStatus !== "initialized" ||
        !verifiedInspection.platformConfig
      ) {
        throw new Error(
          "Transakcja została potwierdzona, ale nie udało się odczytać Platform PDA."
        );
      }

      setSubmission({
        signature,
        platformConfig: verifiedInspection.platformConfig,
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }, [assertReady, inspect, platformPda, simulation, wallet]);

  const simulationIsCurrent =
    !!walletAddress && simulation?.walletAddress === walletAddress;
  const canSimulate =
    isDevnet &&
    isAdminConfigured &&
    isExpectedWallet &&
    isPhantom &&
    inspection?.programStatus === "ready" &&
    inspection.platformStatus === "missing" &&
    !isInspecting &&
    !isSimulating &&
    !isSubmitting;
  const canSubmit = canSimulate && simulationIsCurrent;

  return {
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
    platformPda: platformPda.toBase58(),
    refresh,
    simulate,
    simulation,
    submit,
    submission,
    walletAddress,
  };
}
