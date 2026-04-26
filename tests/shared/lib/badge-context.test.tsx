import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { BadgeProvider, useBadges } from "@/shared/lib/badge-context";

afterEach(cleanup);

function TestComponent() {
  const { hasUnread, hasUnseenOrders, clearUnread, clearUnseenOrders } = useBadges();
  return (
    <div>
      <span data-testid="unread">{String(hasUnread)}</span>
      <span data-testid="unseen">{String(hasUnseenOrders)}</span>
      <button onClick={clearUnread}>clearUnread</button>
      <button onClick={clearUnseenOrders}>clearUnseen</button>
    </div>
  );
}

describe("BadgeContext", () => {
  it("initializes with provided values", () => {
    render(
      <BadgeProvider initialUnread={true} initialUnseenOrders={true}>
        <TestComponent />
      </BadgeProvider>
    );
    expect(screen.getByTestId("unread").textContent).toBe("true");
    expect(screen.getByTestId("unseen").textContent).toBe("true");
  });

  it("clearUnread sets hasUnread to false", async () => {
    render(
      <BadgeProvider initialUnread={true} initialUnseenOrders={false}>
        <TestComponent />
      </BadgeProvider>
    );
    await act(async () => {
      screen.getByText("clearUnread").click();
    });
    expect(screen.getByTestId("unread").textContent).toBe("false");
  });

  it("clearUnseenOrders sets hasUnseenOrders to false", async () => {
    render(
      <BadgeProvider initialUnread={false} initialUnseenOrders={true}>
        <TestComponent />
      </BadgeProvider>
    );
    await act(async () => {
      screen.getByText("clearUnseen").click();
    });
    expect(screen.getByTestId("unseen").textContent).toBe("false");
  });

  it("throws when useBadges is used outside BadgeProvider", () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<TestComponent />)).toThrow();
    console.error = original;
  });
});
