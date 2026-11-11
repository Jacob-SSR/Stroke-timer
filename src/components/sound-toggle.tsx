"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { Case } from "@/lib/model";
export default function SoundToggle({ cases }: { cases: Case[] }) {
  const [on, setOn] = useState(false),
    audio = useRef<AudioContext | null>(null),
    known = useRef<Set<string> | null>(null);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    const ids = new Set(
        cases.flatMap((c) =>
          c.notes.filter((n) => n.important).map((n) => n.id),
        ),
      ),
      fresh = known.current && [...ids].some((id) => !known.current!.has(id));
    known.current = ids;
    if (!on || !fresh || audio.current?.state !== "running") return;
    const context = audio.current,
      osc = context.createOscillator(),
      gain = context.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.5);
  }, [cases, on]);
  return (
    <button
      aria-pressed={on}
      title="ส่งเสียงเมื่อมีบันทึกสำคัญใหม่ขณะเปิดจอนี้"
      onClick={() => {
        if (!on) {
          audio.current ??= new AudioContext();
          void audio.current.resume();
        }
        setOn(!on);
      }}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}เสียง{" "}
      {on ? "เปิด" : "ปิด"}
    </button>
  );
}
