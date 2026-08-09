import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { memoryData, publicAsset } from "./memoryData";

const STORAGE_KEY = "memory-arcade-unlocked";
const EXPERIENCE_PROGRESS_KEY = "memory-arcade-experience-progress-v1";
const SURPRISE_PROGRESS_KEY = "memory-arcade-surprise-progress-v1";
const FOLLOWUP_SURPRISE_WAIT_MS = 60 * 60 * 1000;
const EXPERIENCE_STAGES = new Set(["invitation", "signature", "welcome", "arcade"]);

function createDefaultExperienceProgress() {
  return {
    stage: "invitation",
    visitedIds: [],
    quizCurrent: 0,
    unlocked: false,
  };
}

function readExperienceProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(EXPERIENCE_PROGRESS_KEY) || "null");
    const legacyUnlocked = localStorage.getItem(STORAGE_KEY) === "true";
    const unlocked = Boolean(saved?.unlocked || legacyUnlocked);
    const validMilestoneIds = new Set(memoryData.milestones.map((milestone) => milestone.id));
    const visitedIds = Array.isArray(saved?.visitedIds)
      ? [...new Set(saved.visitedIds.filter((id) => validMilestoneIds.has(id)))]
      : [];
    const maximumQuestion = unlocked
      ? memoryData.quizQuestions.length
      : memoryData.quizQuestions.length - 1;
    const quizCurrent = Math.min(
      maximumQuestion,
      Math.max(0, Number.isInteger(saved?.quizCurrent) ? saved.quizCurrent : 0),
    );
    const stage = EXPERIENCE_STAGES.has(saved?.stage)
      ? saved.stage
      : legacyUnlocked
        ? "arcade"
        : "invitation";

    return { stage, visitedIds, quizCurrent, unlocked };
  } catch {
    return createDefaultExperienceProgress();
  }
}

function saveExperienceProgress(progress) {
  try {
    localStorage.setItem(EXPERIENCE_PROGRESS_KEY, JSON.stringify(progress));
    if (progress.unlocked) localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Progress still works for this visit if browser storage is unavailable.
  }
}

function readSurpriseProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(SURPRISE_PROGRESS_KEY) || "null");
    const revealedCount = Math.min(
      memoryData.finaleTickets.length,
      Math.max(0, Number.isInteger(saved?.revealedCount) ? saved.revealedCount : 0),
    );
    const nextUnlockAt = revealedCount > 1 && revealedCount < memoryData.finaleTickets.length
      && Number.isFinite(saved?.nextUnlockAt)
      ? saved.nextUnlockAt
      : null;
    return { revealedCount, nextUnlockAt };
  } catch {
    return { revealedCount: 0, nextUnlockAt: null };
  }
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function useBirthdayMusic() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const getAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio(publicAsset(memoryData.site.music.src));
      audio.loop = true;
      audio.volume = 0.28;
      audio.preload = "none";
      audio.addEventListener("error", () => {
        setPlaying(false);
        setError("The soundtrack could not be loaded. Please try again.");
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const stop = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const toggle = async () => {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      setError("");
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("Tap once more to start the soundtrack.");
    }
  };

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  return { playing, error, onToggle: toggle, stop };
}

function useDialog(open, onClose) {
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const getFocusables = () => dialog?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    getFocusables()?.[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      const focusables = getFocusables();
      if (event.key !== "Tab" || !focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  return dialogRef;
}

function Doodle({ children, className = "" }) {
  return (
    <span aria-hidden="true" className={`doodle ${className}`}>
      {children}
    </span>
  );
}

function MusicToggle({ playing, error, onToggle }) {
  return (
    <div className="relative">
      <button
        type="button"
        className="music-toggle"
        onClick={onToggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause magical birthday music" : "Play magical birthday music"}
      >
        <span aria-hidden="true">{playing ? "♫" : "♪"}</span>
        {playing ? "Music playing" : "Play music"}
      </button>
      <p className="sr-only" aria-live="polite">
        {error}
      </p>
      {error && <span className="music-hint">{error}</span>}
    </div>
  );
}

function MagicInvitation({ onReveal }) {
  const reduceMotion = useReducedMotion();
  const sparks = ["✦", "✧", "★", "☾", "✦", "⚡", "✧"];

  return (
    <motion.div
      className="invitation-screen"
      initial={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.08 }}
      transition={{ duration: reduceMotion ? 0 : 0.7 }}
    >
      <div className="invitation-sky" aria-hidden="true" />
      <div className="castle-silhouette" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      {sparks.map((spark, index) => (
        <motion.span
          key={`${spark}-${index}`}
          className={`invitation-spark invitation-spark-${index + 1}`}
          aria-hidden="true"
          animate={reduceMotion ? {} : { opacity: [0.35, 1, 0.35], y: [0, -8, 0] }}
          transition={{ duration: 2.2 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
        >
          {spark}
        </motion.span>
      ))}

      <motion.main
        className="invitation-wrap"
        initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 105, damping: 16, delay: 0.15 }}
      >
        <p className="invitation-delivery">✦ SPECIAL MAGICAL DELIVERY ✦</p>
        <div className="enchanted-envelope">
          <div className="envelope-flap" aria-hidden="true" />
          <div className="invitation-address">
            <span>To</span>
            <strong>Ritika</strong>
            <small>Wherever the magic finds her</small>
          </div>
          <button
            type="button"
            className="wax-seal"
            onClick={onReveal}
            aria-label="Break the enchanted seal and reveal Ritika's surprise"
          >
            <span aria-hidden="true">R</span>
          </button>
        </div>
        <h1>A mysterious invitation has arrived</h1>
        <p>Somewhere between Platform 9¾ and a little birthday magic, an enchanted surprise is waiting for you.</p>
        <button type="button" className="invitation-button" onClick={onReveal}>
          Break the seal to reveal it <span aria-hidden="true">⚡</span>
        </button>
        <p className="invitation-whisper">Best opened by the birthday witch herself</p>
      </motion.main>
    </motion.div>
  );
}

function SignatureReveal({ onComplete }) {
  const reduceMotion = useReducedMotion();
  const completedRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const sparks = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${7 + ((index * 29) % 86)}%`,
    top: `${10 + ((index * 37) % 74)}%`,
    delay: `${0.35 + (index % 7) * 0.16}s`,
  }));

  const finishReveal = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    completeRef.current();
  };

  return (
    <motion.div
      className="signature-reveal-screen"
      role="status"
      aria-live="polite"
      aria-label="Birthday magic is signing Ritika's invitation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
    >
      <div className="spell-vignette" aria-hidden="true" />
      <div className="spell-flash" aria-hidden="true" />
      <div className="spell-curtain spell-curtain-left" aria-hidden="true" />
      <div className="spell-curtain spell-curtain-right" aria-hidden="true" />
      <div className="wand-flight" aria-hidden="true"><i /></div>
      <div className="spell-sparks" aria-hidden="true">
        {sparks.map((spark) => (
          <i key={spark.id} style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }} />
        ))}
      </div>

      <div className="signature-stage">
        <p className="spell-awakens">THE ENCHANTED SEAL HAS CHOSEN</p>
        <div className="signature-name" aria-label="Ritika">
          <span aria-hidden="true">Ritika</span>
          <i aria-hidden="true" />
        </div>
        <p className="signature-birthday">Happy Birthday</p>
        <div className="spell-divider" aria-hidden="true"><span>✦</span><i /><span>⚡</span><i /><span>✦</span></div>
        <p className="spell-promise">Your magical adventure is about to begin…</p>
      </div>

      <button
        type="button"
        className="continue-signature"
        data-testid="continue-signature"
        onClick={finishReveal}
      >
        Continue to the Memory Arcade <span aria-hidden="true">✦</span>
      </button>
    </motion.div>
  );
}

function Welcome({ onEnter, music }) {
  const reduceMotion = useReducedMotion();
  const floaters = ["✦", "☾", "✧", "★", "⚡", "♡", "✦", "☼"];

  return (
    <motion.div
      className="welcome-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: reduceMotion ? 0 : 0.55 }}
    >
      <div className="welcome-grain" />
      {floaters.map((symbol, index) => (
        <motion.span
          key={`${symbol}-${index}`}
          className={`floater floater-${index + 1}`}
          aria-hidden="true"
          animate={reduceMotion ? {} : { y: [0, -10, 0], rotate: [0, index % 2 ? 8 : -8, 0] }}
          transition={{ duration: 3.5 + index * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {symbol}
        </motion.span>
      ))}
      <div className="welcome-topbar">
        <span className="tiny-label">FOR {memoryData.site.herNickname}</span>
        <MusicToggle {...music} />
      </div>
      <motion.main
        className="welcome-card"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: -1 }}
        transition={{ type: "spring", stiffness: 130, damping: 16, delay: 0.15 }}
      >
        <span className="tape tape-top" aria-hidden="true" />
        <p className="eyebrow">{memoryData.site.eyebrow}</p>
        <div className="pixel-heart" aria-hidden="true">♥</div>
        <h1>{memoryData.site.greeting}</h1>
        <p className="welcome-copy">{memoryData.site.intro}</p>
        <button type="button" className="primary-button" onClick={onEnter}>
          {memoryData.site.enterLabel}
        </button>
        <p className="microcopy">made with birthday magic, snacks & suspicious amounts of nostalgia</p>
      </motion.main>
      <span className="paper-scrap scrap-one" aria-hidden="true" />
      <span className="paper-scrap scrap-two" aria-hidden="true" />
    </motion.div>
  );
}

function Header({ music }) {
  return (
    <header className="site-header">
      <a href="#top" className="brand" aria-label="Memory Arcade home">
        <span aria-hidden="true">✧</span> memory arcade
      </a>
      <nav aria-label="Main navigation">
        <a href="#map">Map</a>
        <a href="#quiz">Quiz</a>
        <a href="#letter">Secret</a>
      </nav>
      <MusicToggle {...music} />
    </header>
  );
}

function SectionHeading({ kicker, title, copy }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function StoryPhoto({ milestone }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [milestone.id]);

  return (
    <div className="polaroid">
      {!failed ? (
        <img
          src={milestone.photo}
          alt={milestone.caption}
          className={milestone.photoPortrait ? "portrait-memory-photo" : ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="photo-placeholder" role="img" aria-label={`Photo unavailable for ${milestone.title}`}>
          <span aria-hidden="true">{milestone.icon}</span>
          <strong>YOUR PHOTO HERE</strong>
          <small>{milestone.photo}</small>
        </div>
      )}
      <p>{milestone.caption}</p>
    </div>
  );
}

function StoryModal({ milestone, onClose }) {
  const open = Boolean(milestone);
  const dialogRef = useDialog(open, onClose);
  const reduceMotion = useReducedMotion();
  if (!milestone) return null;

  return (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        ref={dialogRef}
        className="story-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-title"
        initial={reduceMotion ? false : { opacity: 0, y: 36, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 220, damping: 23 }}
      >
        <button type="button" className="close-button" onClick={onClose} aria-label="Close memory">
          ×
        </button>
        <StoryPhoto milestone={milestone} />
        <div className="story-copy">
          <p className="eyebrow">Memory {milestone.number} · {milestone.date}</p>
          <h3 id="story-title">{milestone.title}</h3>
          <p>{milestone.story}</p>
          <span className="story-stamp" aria-hidden="true">VISITED ♥</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MemoryMap({ visitedIds, onVisit }) {
  const [selected, setSelected] = useState(null);
  const visited = useMemo(() => new Set(visitedIds), [visitedIds]);

  const openMemory = (milestone) => {
    onVisit(milestone.id);
    setSelected(milestone);
  };

  return (
    <section id="map" className="section map-section">
      <SectionHeading
        kicker="Chapter one · the scenic route"
        title="A map of us"
        copy="Every pin is a place I keep returning to. Tap a landmark to open the memory."
      />
      <div className="map-shell">
        <span className="tape map-tape-one" aria-hidden="true" />
        <span className="tape map-tape-two" aria-hidden="true" />
        <Doodle className="map-note">good days<br />live here ↘</Doodle>
        <Doodle className="map-heart">♡</Doodle>
        <svg className="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M21 7 C 61 9, 82 13, 75 20 S 18 27, 27 33 S 88 40, 76 46 S 14 53, 24 59 S 83 67, 74 73 S 21 80, 31 88" />
        </svg>
        {memoryData.milestones.map((milestone, index) => (
          <motion.button
            type="button"
            key={milestone.id}
            className={`map-pin pin-${index + 1} ${visited.has(milestone.id) ? "visited" : ""}`}
            style={{ left: `${milestone.position.x}%`, top: `${milestone.position.y}%` }}
            onClick={() => openMemory(milestone)}
            whileHover={{ y: -5, rotate: index % 2 ? 2 : -2 }}
            whileTap={{ scale: 0.96 }}
            aria-label={`Open memory ${milestone.number}: ${milestone.title}${visited.has(milestone.id) ? ", visited" : ""}`}
          >
            <span className="pin-icon" aria-hidden="true">{milestone.icon}</span>
            <span className="pin-copy">
              <small>{milestone.number}</small>
              <strong>{milestone.title}</strong>
              <em>{milestone.date}</em>
            </span>
            {visited.has(milestone.id) && <span className="visited-stamp" aria-hidden="true">♥</span>}
          </motion.button>
        ))}
        <div className="map-legend">
          <span>✦ tap to remember</span>
          <span>♥ {visited.size} / {memoryData.milestones.length} visited</span>
        </div>
      </div>
      <AnimatePresence>
        {selected && <StoryModal milestone={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}

function LockedSecret() {
  return (
    <div className="locked-secret" id="letter">
      <span aria-hidden="true">♡</span>
      <div>
        <p className="eyebrow">One last envelope</p>
        <h3>Complete the quiz to break the seal</h3>
      </div>
    </div>
  );
}

function Quiz({ unlocked, current, onPersistCheckpoint, onAdvance, onUnlock }) {
  const [feedback, setFeedback] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const question = memoryData.quizQuestions[current];
  const completedHearts = unlocked ? memoryData.quizQuestions.length : current;

  const answer = (choiceIndex) => {
    if (transitioning || unlocked) return;
    if (choiceIndex !== question.correctAnswer) {
      setFeedback({ type: "wrong", text: `A charming answer—but the Memory Arcade suspects selective memory. ${question.hint}` });
      return;
    }
    setFeedback({ type: "right", text: question.success });
    setTransitioning(true);
    const isFinalQuestion = current === memoryData.quizQuestions.length - 1;
    const checkpoint = isFinalQuestion
      ? { quizCurrent: memoryData.quizQuestions.length, unlocked: true }
      : { quizCurrent: current + 1 };
    onPersistCheckpoint(checkpoint);
    window.setTimeout(() => {
      if (isFinalQuestion) {
        onUnlock();
      } else {
        onAdvance(current + 1);
        setFeedback(null);
        setTransitioning(false);
      }
    }, 850);
  };

  return (
    <section id="quiz" className="section quiz-section">
      <SectionHeading
        kicker="Chapter two · player one"
        title="The very official us quiz"
        copy="Five questions. Unlimited retries. Absolutely no pressure (except the dramatic kind)."
      />
      <div className="quiz-layout">
        <div className="quiz-progress" aria-label={`${completedHearts} of ${memoryData.quizQuestions.length} questions complete`}>
          {memoryData.quizQuestions.map((item, index) => (
            <span key={item.prompt} className={index < completedHearts ? "filled" : ""} aria-hidden="true">♥</span>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              className="quiz-card"
              key={current}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              <span className="tape quiz-tape" aria-hidden="true" />
              <div className="quiz-meta">
                <span>QUESTION {String(current + 1).padStart(2, "0")}</span>
                <span>{current + 1} / {memoryData.quizQuestions.length}</span>
              </div>
              <h3>{question.prompt}</h3>
              <div className="answer-list">
                {question.choices.map((choice, index) => (
                  <button
                    type="button"
                    key={choice}
                    onClick={() => answer(index)}
                    disabled={transitioning}
                  >
                    <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    {choice}
                  </button>
                ))}
              </div>
              <p className={`quiz-feedback ${feedback?.type || ""}`} aria-live="polite">
                {feedback?.text || "Choose wisely. I have receipts."}
              </p>
            </motion.div>
          ) : (
            <motion.div className="quiz-complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="completion-burst" aria-hidden="true">♥</span>
              <p className="eyebrow">Perfect score</p>
              <h3>Secret level unlocked</h3>
              <p>As if I ever doubted my favourite teammate.</p>
              <a href="#letter" className="primary-button">Open the final envelope ↓</a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function LoveLetter({ onFinale }) {
  const reduceMotion = useReducedMotion();
  return (
    <section id="letter" className="section letter-section">
      <SectionHeading kicker="Chapter three · birthday transmission" title="A note for the birthday auntie" />
      <motion.article
        className="love-letter"
        initial={reduceMotion ? false : { opacity: 0, rotateX: -34, y: 40 }}
        whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      >
        <span className="letter-fold" aria-hidden="true" />
        <span className="tape letter-tape" aria-hidden="true" />
        <p className="eyebrow">{memoryData.hiddenMessage.eyebrow}</p>
        <h3>{memoryData.hiddenMessage.heading}</h3>
        {memoryData.hiddenMessage.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className="letter-signoff">
          {memoryData.hiddenMessage.signoff}<br />
          <strong>— from someone who fully supports the eating and sleeping plan ♡</strong>
        </p>
        <button type="button" className="primary-button finale-button" onClick={onFinale}>
          Reveal all five surprises ✦
        </button>
      </motion.article>
    </section>
  );
}

function Barcode() {
  const bars = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4];
  return (
    <div className="barcode" aria-hidden="true">
      {bars.map((width, index) => <i key={index} style={{ width }} />)}
    </div>
  );
}

function SurpriseImage({ ticket }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="surprise-image">
      {!failed ? (
        <img
          src={ticket.image}
          alt={ticket.imageAlt}
          loading="lazy"
          decoding="async"
          width="1200"
          height="525"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={`surprise-placeholder surprise-${ticket.id}`} role="img" aria-label={ticket.imageAlt}>
          <span aria-hidden="true">{ticket.icon}</span>
          <small>YOUR CINEMATIC SURPRISE IMAGE</small>
        </div>
      )}
    </div>
  );
}

function SurpriseTicket({ ticket, index }) {
  return (
    <motion.article
      className="ticket"
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 18 }}
    >
      <div className="ticket-main">
        <div className="ticket-heading">
          <span>{ticket.label}</span>
          <span>♥ RITIKA'S MEMORY ARCADE</span>
        </div>
        <SurpriseImage ticket={ticket} />
        <p className="ticket-kicker">{ticket.location}</p>
        <h3>{ticket.title}</h3>
        <div className="ticket-grid">
          <div><small>HOLDER</small><strong>RITIKA</strong></div>
          <div><small>VALID FROM</small><strong>{ticket.validFrom}</strong></div>
          <div className="wide"><small>YOUR CLUE</small><strong>{ticket.clue}</strong></div>
          <div className="wide"><small>TO REDEEM</small><strong>{ticket.redemption}</strong></div>
        </div>
      </div>
      <div className="ticket-stub">
        <span className="stub-heart" aria-hidden="true">{ticket.icon}</span>
        <small>CONFIRMATION</small>
        <strong>{ticket.code}</strong>
        <Barcode />
        <span className="ticket-number">NO. {String(index + 1).padStart(4, "0")} / BIRTHDAY 26</span>
      </div>
    </motion.article>
  );
}

function FinaleModal({ open, onClose }) {
  const dialogRef = useDialog(open, onClose);
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(readSurpriseProgress);
  const [now, setNow] = useState(Date.now);
  const confetti = useMemo(() => Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    delay: `${(index % 8) * 0.11}s`,
    color: ["#d97d91", "#c8b8dc", "#f5df91", "#b7c8ae"][index % 4],
  })), []);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const totalSurprises = memoryData.finaleTickets.length;
  const allRevealed = progress.revealedCount >= totalSurprises;
  const waitRemaining = progress.nextUnlockAt ? Math.max(0, progress.nextUnlockAt - now) : 0;
  const canRevealNext = !allRevealed
    && (progress.revealedCount <= 1 || !progress.nextUnlockAt || waitRemaining === 0);
  const nextNumber = progress.revealedCount + 1;

  const revealNext = () => {
    if (!canRevealNext) return;
    const revealedAt = Date.now();
    const revealedCount = Math.min(totalSurprises, progress.revealedCount + 1);
    const waitDuration = revealedCount <= 1 ? 0 : FOLLOWUP_SURPRISE_WAIT_MS;
    const nextProgress = {
      revealedCount,
      nextUnlockAt: revealedCount < totalSurprises && waitDuration > 0
        ? revealedAt + waitDuration
        : null,
    };
    try {
      localStorage.setItem(SURPRISE_PROGRESS_KEY, JSON.stringify(nextProgress));
    } catch {
      // The timer still works for this visit if storage is unavailable.
    }
    setNow(revealedAt);
    setProgress(nextProgress);
  };

  if (!open) return null;

  return (
    <motion.div className="modal-backdrop finale-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {!reduceMotion && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((piece) => <i key={piece.id} style={{ left: piece.left, animationDelay: piece.delay, background: piece.color }} />)}
        </div>
      )}
      <motion.div
        ref={dialogRef}
        className="finale-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="surprises-title"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.82, rotate: -3 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 190, damping: 19 }}
      >
        <button type="button" className="close-button ticket-close" onClick={onClose} aria-label="Close birthday surprises">×</button>
        <div id="printable-ticket" className="surprises-print-area">
          <div className="surprises-heading">
            <p className="eyebrow">{memoryData.finale.eyebrow}</p>
            <h2 id="surprises-title">{memoryData.finale.heading}</h2>
            <p>{memoryData.finale.intro}</p>
          </div>

          <ol className="surprise-progress" aria-label="Surprise reveal progress">
            {memoryData.finaleTickets.map((ticket, index) => {
              const revealed = index < progress.revealedCount;
              const current = index === progress.revealedCount && !allRevealed;
              return (
                <li key={ticket.id} className={revealed ? "revealed" : current ? "current" : "locked"}>
                  <span aria-hidden="true">{revealed ? ticket.icon : index + 1}</span>
                  <strong>{revealed ? ticket.title : current ? "Next mystery" : "Locked mystery"}</strong>
                  <small>{revealed ? "REVEALED" : current && canRevealNext ? "READY" : "LOCKED"}</small>
                </li>
              );
            })}
          </ol>

          <div className="surprise-ticket-list">
            {memoryData.finaleTickets.slice(0, progress.revealedCount).map((ticket, index) => (
              <SurpriseTicket ticket={ticket} index={index} key={ticket.id} />
            ))}
          </div>

          {!allRevealed && (
            <section className={`surprise-unlock-panel ${canRevealNext ? "ready" : "waiting"}`} aria-label={`Surprise ${nextNumber} unlock`}>
              {canRevealNext ? (
                <>
                  <span className="unlock-icon" aria-hidden="true">{nextNumber === 1 ? "✧" : "🔓"}</span>
                  <p className="eyebrow">Surprise {nextNumber} of {totalSurprises} is ready</p>
                  <h3>{nextNumber === 1 ? "Let the wand choose you" : "Your next mystery is waiting"}</h3>
                  <p>{nextNumber === 1
                    ? "The first ticket is yours immediately."
                    : nextNumber === 2
                      ? "The second ticket is ready immediately too. Tap when you are ready."
                      : "The one-hour spell has lifted. Tap when you are ready."}</p>
                  <button type="button" className="primary-button" onClick={revealNext}>
                    Reveal surprise {nextNumber} of {totalSurprises} ✦
                  </button>
                </>
              ) : (
                <>
                  <span className="unlock-icon" aria-hidden="true">⌛</span>
                  <p className="eyebrow">One-hour mystery lock</p>
                  <h3>Next surprise unlocks in</h3>
                  <time className="surprise-countdown" dateTime={`PT${Math.ceil(waitRemaining / 1000)}S`}>
                    {formatCountdown(waitRemaining)}
                  </time>
                        <p>Come back at {new Date(progress.nextUnlockAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.</p>
                  <button type="button" className="primary-button" disabled>
                    Surprise {nextNumber} is locked 🔒
                  </button>
                </>
              )}
            </section>
          )}
        </div>
        <div className="ticket-actions">
          <p>{allRevealed ? "All five mysteries have been revealed. Mischief managed." : `${progress.revealedCount} of ${totalSurprises} surprises revealed.`}</p>
          {allRevealed && (
            <button type="button" className="primary-button" onClick={() => window.print()}>Save / print all tickets</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ResetConfirmation({ open, onCancel, onConfirm }) {
  const dialogRef = useDialog(open, onCancel);
  const reduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const submitReset = (event) => {
    event.preventDefault();
    if (password.trim() !== "GV") {
      setPasswordError("That password is incorrect. Progress has not been erased.");
      return;
    }
    setPasswordError("");
    onConfirm();
  };

  if (!open) return null;

  return (
    <motion.div
      className="modal-backdrop reset-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.form
        ref={dialogRef}
        className="reset-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-description"
        initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        onSubmit={submitReset}
      >
        <span className="reset-icon" aria-hidden="true">🫰</span>
        <p className="eyebrow">Thanos reset</p>
        <h2 id="reset-title">Start the entire arcade again?</h2>
        <p id="reset-description">Are you sure? This will erase every visited memory, quiz answer, revealed surprise and active timer on this browser. Enter the reset password to continue.</p>
        <div className="reset-password-field">
          <label htmlFor="thanos-password">Reset password</label>
          <input
            id="thanos-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError("");
            }}
            autoComplete="off"
            spellCheck="false"
          />
          <p className="reset-error" role="alert" aria-live="polite">{passwordError}</p>
        </div>
        <div className="reset-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Keep my progress</button>
          <button type="submit" className="primary-button reset-confirm-button">Yes, erase everything</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function App() {
  const [experience, setExperience] = useState(readExperienceProgress);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [runId, setRunId] = useState(0);
  const music = useBirthdayMusic();

  const updateExperience = (updater) => {
    setExperience((current) => {
      const next = typeof updater === "function"
        ? updater(current)
        : { ...current, ...updater };
      saveExperienceProgress(next);
      return next;
    });
  };

  const persistExperienceCheckpoint = (patch) => {
    saveExperienceProgress({ ...experience, ...patch });
  };

  const invitationOpen = experience.stage === "invitation";
  const signatureOpen = experience.stage === "signature";
  const welcomeOpen = experience.stage === "welcome";

  const enter = () => {
    updateExperience({ stage: "arcade" });
    window.setTimeout(() => document.getElementById("top")?.focus(), 150);
  };

  const revealBirthday = () => {
    updateExperience({ stage: "signature" });
  };

  const completeSignatureReveal = () => {
    updateExperience({ stage: "welcome" });
    window.setTimeout(() => document.querySelector(".welcome-card .primary-button")?.focus(), 150);
  };

  const thanosReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPERIENCE_PROGRESS_KEY);
      localStorage.removeItem(SURPRISE_PROGRESS_KEY);
    } catch {
      // The in-memory reset still works when browser storage is unavailable.
    }
    music.stop();
    setResetOpen(false);
    setExperience(createDefaultExperienceProgress());
    setFinaleOpen(false);
    setRunId((value) => value + 1);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const themeStyle = Object.fromEntries(
    Object.entries(memoryData.site.theme).map(([name, value]) => [`--${name}`, value]),
  );

  return (
    <div className="memory-app-root" style={themeStyle}>
      <a className="skip-link" href="#main-content">Skip to memories</a>
      <AnimatePresence>{invitationOpen && <MagicInvitation onReveal={revealBirthday} />}</AnimatePresence>
      <AnimatePresence>{signatureOpen && <SignatureReveal onComplete={completeSignatureReveal} />}</AnimatePresence>
      <AnimatePresence>{!invitationOpen && !signatureOpen && welcomeOpen && <Welcome onEnter={enter} music={music} />}</AnimatePresence>
      <div
        className={invitationOpen || signatureOpen || welcomeOpen ? "app-shell app-hidden" : "app-shell"}
        aria-hidden={invitationOpen || signatureOpen || welcomeOpen}
        inert={invitationOpen || signatureOpen || welcomeOpen}
      >
        <Header music={music} />
        <main id="main-content" key={runId}>
          <section id="top" className="hero-section" tabIndex="-1">
            <div className="hero-copy">
              <p className="eyebrow">Welcome, player one</p>
              <h1>{memoryData.site.title}</h1>
              <p>Seven little worlds, one very good story, and just enough magic.</p>
              <a href="#map" className="text-link">Start at the beginning <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-polaroids">
              <figure className="mini-polaroid back hero-photo hero-photo-secondary">
                <img
                  src={publicAsset("/photos/ritika-title-harry-potter.webp?v=1")}
                  alt="Ritika smiling at Platform Nine and Three-Quarters"
                  decoding="async"
                  fetchPriority="high"
                  width="675"
                  height="900"
                />
                <figcaption>off to Hogwarts ⚡</figcaption>
              </figure>
              <figure className="mini-polaroid front hero-photo">
                <img
                  src={publicAsset("/photos/ritika-title.webp?v=1")}
                  alt="Ritika smiling beneath glowing lights and trees"
                  decoding="async"
                  fetchPriority="high"
                  width="506"
                  height="900"
                />
                <figcaption>the birthday star ✦</figcaption>
              </figure>
            </div>
            <Doodle className="hero-doodle">best viewed<br />with a full heart ↗</Doodle>
          </section>
          <MemoryMap
            visitedIds={experience.visitedIds}
            onVisit={(milestoneId) => updateExperience((current) => current.visitedIds.includes(milestoneId)
              ? current
              : { ...current, visitedIds: [...current.visitedIds, milestoneId] })}
          />
          <div className="chapter-break" aria-hidden="true"><span>✦</span><i /><span>♥</span><i /><span>✦</span></div>
          <Quiz
            unlocked={experience.unlocked}
            current={experience.quizCurrent}
            onPersistCheckpoint={persistExperienceCheckpoint}
            onAdvance={(quizCurrent) => updateExperience({ quizCurrent })}
            onUnlock={() => updateExperience({
              quizCurrent: memoryData.quizQuestions.length,
              unlocked: true,
            })}
          />
          {experience.unlocked ? <LoveLetter onFinale={() => setFinaleOpen(true)} /> : <LockedSecret />}
        </main>
        <footer>
          <p>Made for {memoryData.site.herNickname}, by {memoryData.site.yourName}.</p>
          <button
            type="button"
            className="thanos-reset"
            onClick={() => setResetOpen(true)}
            aria-label="Thanos reset: erase all Memory Arcade progress and return to the welcome screen"
          >
            <span aria-hidden="true">🫰</span>
            <strong>Thanos reset</strong>
            <small>erase every test and start from the beginning</small>
          </button>
        </footer>
      </div>
      <AnimatePresence>{finaleOpen && <FinaleModal open={finaleOpen} onClose={() => setFinaleOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {resetOpen && <ResetConfirmation open={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={thanosReset} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
