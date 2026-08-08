import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("Memory Arcade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens the arcade from the welcome screen", () => {
    render(<App />);
    expect(document.querySelector(".app-shell")).toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    expect(screen.getByRole("heading", { name: "Ritika's Memory Arcade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A map of us" })).toBeInTheDocument();
    expect(document.querySelector(".app-shell")).not.toHaveAttribute("inert");
  });

  it("opens a milestone as an accessible dialog", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: /open memory 01/i }));
    expect(screen.getByRole("dialog", { name: "New Year in Scotland" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /one nervous flight and an unforgettable new year/i })).toBeInTheDocument();
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

  it("reveals the wand first and starts the eight-hour thirty-minute lock", () => {
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
    const remaining = savedProgress.nextUnlockAt - Date.now();
    expect(remaining).toBeGreaterThan(8 * 60 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(8.5 * 60 * 60 * 1000);
  });

  it("allows the Shard reveal when the saved first lock has elapsed, then starts a one-hour lock", () => {
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

    const savedProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    const remaining = savedProgress.nextUnlockAt - Date.now();
    expect(savedProgress.revealedCount).toBe(2);
    expect(remaining).toBeGreaterThan(59 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("uses the Thanos reset to erase quiz and timer progress and return to question one", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    localStorage.setItem("memory-arcade-surprise-progress-v1", JSON.stringify({
      revealedCount: 1,
      nextUnlockAt: Date.now() + 60 * 60 * 1000,
    }));

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: /open memory 01/i }));
    fireEvent.click(screen.getByRole("button", { name: "Close memory" }));
    expect(screen.getByText("♥ 1 / 7 visited")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thanos reset/i }));

    expect(screen.getByRole("alertdialog", { name: /start the entire arcade again/i })).toBeInTheDocument();
    expect(localStorage.getItem("memory-arcade-unlocked")).toBe("true");
    expect(localStorage.getItem("memory-arcade-surprise-progress-v1")).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/reset password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /yes, erase everything/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/password is incorrect/i);
    expect(localStorage.getItem("memory-arcade-unlocked")).toBe("true");
    expect(localStorage.getItem("memory-arcade-surprise-progress-v1")).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/reset password/i), { target: { value: "GV" } });
    fireEvent.click(screen.getByRole("button", { name: /yes, erase everything/i }));

    expect(localStorage.getItem("memory-arcade-unlocked")).toBeNull();
    expect(localStorage.getItem("memory-arcade-surprise-progress-v1")).toBeNull();
    expect(screen.getByRole("button", { name: /start your birthday adventure/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    expect(screen.getByRole("heading", { name: "Which animal is Ritika most frightened of?" })).toBeInTheDocument();
    expect(screen.getByLabelText("0 of 5 questions complete")).toBeInTheDocument();
    expect(screen.getByText("♥ 0 / 7 visited")).toBeInTheDocument();
  });

  it("cancels the Thanos reset without losing progress", async () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    fireEvent.click(screen.getByRole("button", { name: /thanos reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep my progress/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(localStorage.getItem("memory-arcade-unlocked")).toBe("true");
    expect(screen.getByRole("heading", { name: "Happy 26th Birthday, Ritika!" })).toBeInTheDocument();
  });
});
