import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

const revealInvitation = () => {
  const revealButtons = screen.getAllByRole("button", { name: /break the seal to reveal it/i });
  fireEvent.click(revealButtons[revealButtons.length - 1]);
  expect(screen.getByRole("status", { name: /birthday magic is signing ritika's invitation/i })).toBeInTheDocument();
  const continueButtons = screen.getAllByTestId("continue-signature");
  fireEvent.click(continueButtons[continueButtons.length - 1]);
};

const enterArcade = () => {
  if (!screen.queryByRole("heading", { name: /a mysterious invitation has arrived/i })) return;
  revealInvitation();
  fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
};

describe("Memory Arcade", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  it("reveals the birthday welcome from the enchanted invitation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /a mysterious invitation has arrived/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /happy birthday, ritika/i })).not.toBeInTheDocument();
    expect(document.querySelector(".app-shell")).toHaveAttribute("inert");
    fireEvent.click(screen.getByRole("button", { name: /break the seal to reveal it/i }));
    expect(screen.getByRole("status", { name: /birthday magic is signing ritika's invitation/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Ritika")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /happy birthday, ritika/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("continue-signature"));
    expect(screen.getByRole("heading", { name: /happy birthday, ritika/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /start your birthday adventure/i }));
    expect(screen.getByRole("heading", { name: "Ritika's Memory Arcade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A map of us" })).toBeInTheDocument();
    expect(document.querySelector(".app-shell")).not.toHaveAttribute("inert");
  });

  it("opens a milestone as an accessible dialog", async () => {
    render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: /open memory 01/i }));
    expect(screen.getByRole("dialog", { name: "New Year in Scotland" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /one nervous flight and an unforgettable new year/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close memory" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "New Year in Scotland" })).not.toBeInTheDocument();
    });
  });

  it("restores the opening stage, visited memories, and partial quiz progress after a refresh", () => {
    const firstVisit = render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: /open memory 01/i }));
    fireEvent.click(screen.getByRole("button", { name: "Close memory" }));
    fireEvent.click(screen.getByRole("button", { name: "Dogs" }));
    const savedExperience = JSON.parse(localStorage.getItem("memory-arcade-experience-progress-v1"));
    expect(savedExperience.quizCurrent).toBe(1);
    expect(JSON.parse(localStorage.getItem("ritika-memory-arcade-progress-v2")).quizCurrent).toBe(1);

    firstVisit.unmount();
    render(<App />);

    expect(screen.queryByRole("heading", { name: /a mysterious invitation has arrived/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ritika's Memory Arcade" })).toBeInTheDocument();
    expect(screen.getByText("♥ 1 / 7 visited")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /which of our trips did ritika enjoy the most/i })).toBeInTheDocument();
    expect(document.querySelector('[aria-label="1 of 5 questions complete"]')).toBeInTheDocument();
  });

  it("offers a gentle hint after an incorrect quiz answer", () => {
    render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: "Snakes" }));
    expect(screen.getByText(/suspects selective memory/i)).toBeInTheDocument();
  });

  it("plays the ad-free soundtrack without opening an external player", async () => {
    render(<App />);
    revealInvitation();
    fireEvent.click(screen.getByRole("button", { name: /play magical birthday music/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pause magical birthday music/i })).toBeInTheDocument();
    });
    expect(document.querySelector("iframe")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pause magical birthday music/i }));
    expect(screen.getByRole("button", { name: /play magical birthday music/i })).toBeInTheDocument();
  });

  it("reveals the wand first and makes The Shard immediately available", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    render(<App />);
    enterArcade();
    expect(screen.getByRole("heading", { name: "Happy 26th Birthday, Ritika!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    expect(screen.getByRole("dialog", { name: "Five surprises for Ritika" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 1 of 5/i }));
    expect(screen.getByRole("heading", { name: "The Wand Chooses Ritika" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reveal surprise 2 of 5/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save \/ print all tickets/i })).not.toBeInTheDocument();

    const savedProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    expect(savedProgress.revealedCount).toBe(1);
    expect(savedProgress.nextUnlockAt).toBeNull();
  });

  it("ignores an old first lock, reveals The Shard, then preserves its one-hour lock after refresh", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    localStorage.setItem("memory-arcade-surprise-progress-v1", JSON.stringify({
      revealedCount: 1,
      nextUnlockAt: Date.now() + 9 * 60 * 60 * 1000,
    }));
    const firstVisit = render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 2 of 5/i }));
    expect(screen.getByRole("heading", { name: "A Date Above London" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise 3 is locked/i })).toBeDisabled();

    const savedProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    const remaining = savedProgress.nextUnlockAt - Date.now();
    expect(savedProgress.revealedCount).toBe(2);
    expect(remaining).toBeGreaterThan(59 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(60 * 60 * 1000);

    firstVisit.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    expect(screen.getByRole("heading", { name: "A Date Above London" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise 3 is locked/i })).toBeDisabled();
    const restoredProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    expect(restoredProgress.nextUnlockAt).toBe(savedProgress.nextUnlockAt);
    expect(JSON.parse(localStorage.getItem("ritika-memory-arcade-progress-v2")).surpriseProgress.nextUnlockAt)
      .toBe(savedProgress.nextUnlockAt);
  });

  it("restores the exact timer from its durable cookie backup after browser storage is lost", () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    const firstVisit = render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 1 of 5/i }));
    fireEvent.click(screen.getByRole("button", { name: /reveal surprise 2 of 5/i }));
    const savedProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));

    firstVisit.unmount();
    localStorage.clear();
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /reveal all five surprises/i }));

    expect(screen.getByRole("heading", { name: "The Wand Chooses Ritika" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A Date Above London" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise 3 is locked/i })).toBeDisabled();
    const restoredProgress = JSON.parse(localStorage.getItem("memory-arcade-surprise-progress-v1"));
    expect(restoredProgress.revealedCount).toBe(2);
    expect(restoredProgress.nextUnlockAt).toBe(savedProgress.nextUnlockAt);
  });

  it("uses the Thanos reset to erase quiz and timer progress and return to question one", async () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    localStorage.setItem("memory-arcade-surprise-progress-v1", JSON.stringify({
      revealedCount: 1,
      nextUnlockAt: Date.now() + 60 * 60 * 1000,
    }));

    render(<App />);
    enterArcade();
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
    expect(localStorage.getItem("memory-arcade-experience-progress-v1")).toBeNull();
    expect(localStorage.getItem("memory-arcade-surprise-progress-v1")).toBeNull();
    expect(localStorage.getItem("ritika-memory-arcade-progress-v2")).toBeNull();
    expect(document.cookie).not.toContain("memory-arcade-experience-progress-v1");
    expect(document.cookie).not.toContain("memory-arcade-surprise-progress-v1");
    expect(document.cookie).not.toContain("ritika-memory-arcade-progress-v2");
    expect(screen.getByRole("heading", { name: /a mysterious invitation has arrived/i })).toBeInTheDocument();
    expect(document.querySelector('[aria-label="0 of 5 questions complete"]')).toBeInTheDocument();
    expect(screen.getByText("♥ 0 / 7 visited")).toBeInTheDocument();
  });

  it("cancels the Thanos reset without losing progress", async () => {
    localStorage.setItem("memory-arcade-unlocked", "true");
    render(<App />);
    enterArcade();
    fireEvent.click(screen.getByRole("button", { name: /thanos reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep my progress/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(localStorage.getItem("memory-arcade-unlocked")).toBe("true");
    expect(screen.getByRole("heading", { name: "Happy 26th Birthday, Ritika!" })).toBeInTheDocument();
  });
});
