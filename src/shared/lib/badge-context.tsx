"use client";

import { createContext, useContext, useState } from "react";

interface BadgeState {
  hasUnread: boolean;
  hasUnseenOrders: boolean;
  clearUnread: () => void;
  clearUnseenOrders: () => void;
}

const BadgeContext = createContext<BadgeState | null>(null);

export function BadgeProvider({
  children,
  initialUnread,
  initialUnseenOrders,
}: {
  children: React.ReactNode;
  initialUnread: boolean;
  initialUnseenOrders: boolean;
}) {
  const [hasUnread, setHasUnread] = useState(initialUnread);
  const [hasUnseenOrders, setHasUnseenOrders] = useState(initialUnseenOrders);

  return (
    <BadgeContext.Provider
      value={{
        hasUnread,
        hasUnseenOrders,
        clearUnread: () => setHasUnread(false),
        clearUnseenOrders: () => setHasUnseenOrders(false),
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges(): BadgeState {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error("useBadges must be used within BadgeProvider");
  return ctx;
}
