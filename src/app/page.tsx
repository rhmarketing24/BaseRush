"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";

/* ---------------- CONFIG ---------------- */
const GRID_SIZE = 25;
const BLUE_COUNT = 13;
const MAX_TIME = 30;
const PENALTY = 2;

/* ---------- UPDATED MINING CONFIG ---------- */
const DAILY_CAP = 100;
const MIN_CLAIM_POINTS = 5;
const MINING_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MINING_RATE = DAILY_CAP / (24 * 60 * 60); // ≈ 0.0011574 point/sec

/* Dummy claim contract */
const CLAIM_CONTRACT = {
  address: "0x0000D14CCf81aD6a9e7b8f03b1F94d57015fCD06" as `0x${string}`,
  abi: [
    {
      name: "claim",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "amount", type: "uint256" }],
      outputs: [],
    },
  ],
};

/* ---------------------------------------- */

type Cell = {
  id: number;
  color: "blue" | "red";
  clicked: boolean;
};

export default function Page() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  /* ----------- FARCASTER / NEYNAR PREP ----------- */
  const [fid, setFid] = useState<number | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "miniapp.context") {
        if (event.data.fid) {
          setFid(event.data.fid);
          console.log("FID found:", event.data.fid);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);


  /* ----------- MINING STATES ----------- */
  const [miningPoints, setMiningPoints] = useState(0);
  const [startMiningAt, setStartMiningAt] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [status, setStatus] = useState("Idle");

  /* ----------- GAME STATES ----------- */
  const [grid, setGrid] = useState<Cell[]>([]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [reward, setReward] = useState(0);
  const [gameMode, setGameMode] = useState(false);

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    window.parent.postMessage({ type: "miniapp.ready", version: 1 }, "*");

    const storedStart = localStorage.getItem("start_mining_at");
    const storedPoints = localStorage.getItem("mining_points");
    if (storedStart) setStartMiningAt(Number(storedStart));
    if (storedPoints) setMiningPoints(Number(storedPoints));
  }, []);

  /* ---------------- MINING LOGIC (FIXED) ---------------- */

  useEffect(() => {
    if (!startMiningAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startMiningAt;

      if (elapsed >= MINING_DURATION) {
        setMiningPoints(DAILY_CAP);
        setRemainingTime(0);
        localStorage.setItem("mining_points", DAILY_CAP.toString());
        return;
      }

      const newPoints = Math.min(
        (elapsed / 1000) * MINING_RATE,
        DAILY_CAP
      );

      setMiningPoints(newPoints);
      setRemainingTime(MINING_DURATION - elapsed);
      localStorage.setItem("mining_points", newPoints.toString());
    }, 1000);

    return () => clearInterval(interval);
  }, [startMiningAt]);

  const startMining = () => {
    if (!isConnected) return alert("⚠️ Wallet not connected");

    // already mining today
    if (startMiningAt && Date.now() - startMiningAt < MINING_DURATION) {
      return alert("⏳ Mining already running");
    }

    const now = Date.now();
    setStartMiningAt(now);
    setMiningPoints(0);

    localStorage.setItem("start_mining_at", now.toString());
    localStorage.setItem("mining_points", "0");

    setStatus("Mining started 🪙");
  };

  const formatTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const claimMining = async () => {
    if (miningPoints < MIN_CLAIM_POINTS)
      return alert(`Minimum ${MIN_CLAIM_POINTS} points required to claim`);

    try {
      setStatus("Claiming mining reward...");

      const claimable = Math.floor(miningPoints);
      const amount = BigInt(claimable) * 10n ** 18n;

      await writeContractAsync({
        address: CLAIM_CONTRACT.address,
        abi: CLAIM_CONTRACT.abi,
        functionName: "claim",
        args: [amount],
      });

      // 🔑 VERY IMPORTANT FIX
      const now = Date.now();

      setMiningPoints(0);
      setStartMiningAt(now);

      localStorage.setItem("mining_points", "0");
      localStorage.setItem("start_mining_at", now.toString());

      setStatus(`Claimed ${claimable} mining points ✅`);
    } catch (err) {
      console.error(err);
      setStatus("Claim failed ❌");
    }
  };

  /* ---------------- GAME LOGIC ---------------- */
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setTime((v) => {
        if (v + 1 >= MAX_TIME) {
          clearInterval(timer);
          endGame();
          return v;
        }
        return v + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const startGame = () => {
    const cells: Cell[] = [];
    const blue = new Set<number>();
    while (blue.size < BLUE_COUNT) {
      blue.add(Math.floor(Math.random() * GRID_SIZE));
    }
    for (let i = 0; i < GRID_SIZE; i++) {
      cells.push({
        id: i,
        color: blue.has(i) ? "blue" : "red",
        clicked: false,
      });
    }
    setGrid(cells);
    setTime(0);
    setFinished(false);
    setRunning(true);
    setStatus("Game started 🎮");
    setGameMode(true);
  };

  const exitGame = () => {
    setRunning(false);
    setFinished(false);
    setGrid([]);
    setTime(0);
    setGameMode(false);
    setStatus("Game exited");
  };

  const calculateReward = (score: number) => {
    if (score >= 12000) return 10;
    if (score >= 10000) return 7;
    if (score >= 7000) return 4;
    if (score >= 4000) return 2;
    return 0;
  };

  const clickCell = (id: number) => {
    if (!running || finished) return;
    setGrid((prev) => {
      const updated = prev.map((c) =>
        c.id === id && !c.clicked ? { ...c, clicked: true } : c
      );

      const remain = updated.filter(
        (c) => c.color === "blue" && !c.clicked
      ).length;

      if (remain === 0) endGame();
      return updated;
    });
  };

  const endGame = () => {
    setRunning(false);
    setFinished(true);

    const score = Math.max(BLUE_COUNT * 1000 - time * 100, 0);
    setGameScore(score);

    const r = calculateReward(score);
    setReward(r);

    setStatus("Game finished 🎯");
  };

  const claimGame = async () => {
    if (reward <= 0) return alert("No reward to claim");

    try {
      setStatus("Claiming game reward...");

      const amount = BigInt(reward) * 10n ** 18n;

      await writeContractAsync({
        address: CLAIM_CONTRACT.address,
        abi: CLAIM_CONTRACT.abi,
        functionName: "claim",
        args: [amount],
      });

      setReward(0);
      setGameScore(0);

      setStatus("Game reward claimed ✅");
    } catch (err) {
      console.error(err);
      setStatus("Game claim failed ❌");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        display: "flex",
        justifyContent: "center",
        padding: "20px 12px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        {/* HEADER */}
        {!gameMode && (
          <div
            style={{
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              Base Rush
            </h2>

            <p
              style={{
                marginTop: 6,
                marginBottom: 12,
                fontSize: 14,
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              Play • Mine • Earn on Base
            </p>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "#f1f5f9",
                fontSize: 14,
                textAlign: "left",
              }}
            >
              {isConnected ? (
                <span>
                  Wallet: <b>{address}</b>
                </span>
              ) : (
                <span>
                  Wallet will auto-connect when opened inside Base App
                </span>
              )}
            </div>
          </div>
        )}


        {/* MINING CARD */}
        {!gameMode && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 18, marginRight: 6 }}>⛏️</span>
              <h4 style={{ margin: 0 }}>Mining</h4>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, color: "#6b7280" }}>Points</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>
                {miningPoints.toFixed(4)} / {DAILY_CAP}
              </span>
            </div>

            {startMiningAt && remainingTime > 0 && (
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 10,
                  padding: "6px 10px",
                  background: "#fef3c7",
                  color: "#92400e",
                  borderRadius: 8,
                  fontSize: 13,
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                ⏳ Next mining in {formatTime(remainingTime)}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={startMining}
                disabled={!!(startMiningAt && remainingTime > 0)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background:
                    startMiningAt && remainingTime > 0 ? "#94a3b8" : "#0ea5e9",
                  color: "#ffffff",
                  fontWeight: 600,
                  cursor:
                    startMiningAt && remainingTime > 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Start Mining
              </button>

              <button
                onClick={claimMining}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "1px solid #0ea5e9",
                  background: "#ffffff",
                  color: "#0ea5e9",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Claim
              </button>
            </div>
          </div>
        )}

        {/* GAME CARD */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 18, marginRight: 6 }}>🎮</span>
            <h4 style={{ margin: 0 }}>Game</h4>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <span style={{ color: "#6b7280" }}>Time</span>
            <span>
              {time}s / {MAX_TIME}s
            </span>
          </div>

          <div
            style={{
              background: "#ffffff",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
            }}
          >
            <span style={{ color: "#6b7280" }}>Score</span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{gameScore}</span>
          </div>

          {!running && !finished && (
            <button
              onClick={startGame}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: "#22c55e",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Start Game
            </button>
          )}

          {running && (
            <button
              onClick={exitGame}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 10,
              }}
            >
              Exit Game
            </button>
          )}
        </div>

        {/* GAME GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            marginTop: 16,
          }}
        >
          {grid.map((c) => (
            <div
              key={c.id}
              onClick={() => clickCell(c.id)}
              style={{
                aspectRatio: "1 / 1",
                background: c.clicked
                  ? "#e5e7eb"
                  : c.color === "blue"
                    ? "#3b82f6"
                    : "#ef4444",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: c.clicked
                  ? "none"
                  : "0 4px 10px rgba(0,0,0,0.12)",
                transition: "transform 0.08s ease, box-shadow 0.08s ease",
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              }}
            />
          ))}
        </div>

        {/* GAME FINISHED */}
        {finished && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 16,
              background: "#f0fdf4",
              border: "1px solid #86efac",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: "#166534",
              }}
            >
              🎉 Game Finished
            </p>

            <p
              style={{
                margin: "6px 0 14px",
                fontSize: 26,
                fontWeight: 800,
                color: "#14532d",
              }}
            >
              Score: {gameScore}
            </p>

            {finished && reward > 0 && (
              <button
                onClick={claimGame}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 12,
                }}
              >
                🎁 Claim Game Reward ({reward})
              </button>
            )}

            <button
              onClick={exitGame}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 12,
                border: "1px solid #22c55e",
                background: "#ffffff",
                color: "#166534",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Exit Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
