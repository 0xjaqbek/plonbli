import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { Button } from "@/shared/ui/button";

afterEach(cleanup);

describe("Button isLoading", () => {
  it("shows spinner and is disabled when isLoading=true", () => {
    render(<Button isLoading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("shows children text when isLoading=true for non-icon buttons", () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("hides children when isLoading=true for icon buttons", () => {
    render(<Button isLoading size="icon">X</Button>);
    expect(screen.queryByText("X")).toBeNull();
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("renders normally when isLoading=false", () => {
    render(<Button isLoading={false}>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
    expect(document.querySelector("svg.animate-spin")).toBeNull();
  });
});
