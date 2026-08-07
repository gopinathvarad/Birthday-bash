import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("Memory Arcade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens the arcade from the welcome screen", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    expect(screen.getByRole("heading", { name: "Ritika's Memory Arcade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A map of us" })).toBeInTheDocument();
  });

  it("opens a milestone as an accessible dialog", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: /open memory 01/i }));
    expect(screen.getByRole("dialog", { name: "New Year in Scotland" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close memory" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New Year in Scotland" })).not.toBeInTheDocument();
    });
  });

  it("offers a gentle hint after an incorrect quiz answer", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: "Snakes" }));
    expect(screen.getByText(/suspects selective memory/i)).toBeInTheDocument();
  });

  it("reveals the wand first and starts the one-hour lock", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    expect(screen.getByRole("heading", { name: "Happy 26th Birthday, Ritika!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    expect(screen.getByRole("dialog", { name: "Five surprises for Ritika" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 1 of 5/i }));
    expect(screen.getByRole("heading", { name: "The Wand Chooses Ritika" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise 2 is locked/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /save \/ print all tickets/i })).not.toBeInTheDocument();

    const savedProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    expect(savedProgress.revealedCount).toBe(1);
    expect(savedProgress.nextUnlockAt).toBeGreaterThan(Date.now());
  });

  it("allows the Shard reveal when the saved hour has elapsed", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    localStorage.setItem("memory-arcade-surprise-progress-v1", JSON.stringify({
      revealedCount: 1,
      nextUnlockAt: Date.now() - 1000,
    }));
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 2 of 5/i }));
    expect(screen.getByRole("heading", { name: "A Date Above London" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise 3 is locked/i })).toBeDisabled();
  });
});
