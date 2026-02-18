import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Card } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Switch } from "@crm/components/ui/switch";
import { Slider } from "@crm/components/ui/slider";
import { cn } from "@crm/lib/utils";
import { logEngagementEvent } from "@crm/lib/engagement";

type SoundMode = "none" | "brown" | "tone";

export type FocusModeTimerHandle = {
  start: () => Promise<void>;
  pause: () => void;
  reset: () => void;
  stop: () => void;
  isRunning: () => boolean;
};

const STORAGE_KEY = "starterhub.focus.settings.v1";

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeParseSettings(raw: string | null): { soundEnabled: boolean; soundMode: SoundMode; volume: number } {
  if (!raw) return { soundEnabled: false, soundMode: "brown", volume: 40 };
  try {
    const v = JSON.parse(raw) as any;
    return {
      soundEnabled: Boolean(v?.soundEnabled),
      soundMode: (v?.soundMode === "tone" || v?.soundMode === "brown" || v?.soundMode === "none")
        ? v.soundMode
        : "brown",
      volume: typeof v?.volume === "number" ? clamp(v.volume, 0, 100) : 40,
    };
  } catch {
    return { soundEnabled: false, soundMode: "brown", volume: 40 };
  }
}

function persistSettings(settings: { soundEnabled: boolean; soundMode: SoundMode; volume: number }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function createBrownNoise(ctx: AudioContext) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    // classic brown noise filter
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = lastOut * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createSoftTone(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 174; // gentle tone
  return osc;
}

export const FocusModeTimer = forwardRef<
  FocusModeTimerHandle,
  {
    className?: string;
    defaultMinutes?: number;
    onRunningChange?: (running: boolean) => void;
    onComplete?: () => void;
    variant?: "default" | "compact";
    showHeader?: boolean;
  }
>(function FocusModeTimer(props, ref) {
  const defaultMinutes = props.defaultMinutes ?? 25;
  const compact = props.variant === "compact";
  const showHeader = props.showHeader ?? true;

  const initialSettings = useMemo(() => {
    if (typeof window === "undefined") return { soundEnabled: false, soundMode: "brown" as SoundMode, volume: 40 };
    return safeParseSettings(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const [totalSeconds, setTotalSeconds] = useState(defaultMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(initialSettings.soundEnabled);
  const [soundMode, setSoundMode] = useState<SoundMode>(initialSettings.soundMode);
  const [volume, setVolume] = useState(initialSettings.volume);

  const intervalRef = useRef<number | null>(null);

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);

  const startAudio = async () => {
    if (!soundEnabled || soundMode === "none") return;

    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = volume / 100;
      gainRef.current = gain;
      gain.connect(ctx.destination);
    }

    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    // Safari/iOS requires resume on user gesture
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Stop any existing
    stopAudio();

    if (soundMode === "brown") {
      const source = createBrownNoise(ctx);
      source.connect(gain);
      source.start();
      sourceRef.current = source;
      return;
    }

    const osc = createSoftTone(ctx);
    osc.connect(gain);
    (osc as OscillatorNode).start();
    sourceRef.current = osc;
  };

  const stopAudio = () => {
    const node = sourceRef.current as any;
    try {
      if (node?.stop) node.stop();
    } catch {
      // ignore
    }
    try {
      if (node?.disconnect) node.disconnect();
    } catch {
      // ignore
    }
    sourceRef.current = null;
  };

  // Keep gain in sync
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  // Persist settings
  useEffect(() => {
    persistSettings({ soundEnabled, soundMode, volume });
  }, [soundEnabled, soundMode, volume]);

  // Stop sound when disabled
  useEffect(() => {
    if (!soundEnabled || soundMode === "none") stopAudio();
  }, [soundEnabled, soundMode]);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // complete
          window.clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          setRunning(false);
          stopAudio();
          logEngagementEvent("focus_session_completed", {
            minutes: Math.round(totalSeconds / 60),
            soundEnabled,
            soundMode,
          });
          props.onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, totalSeconds, soundEnabled, soundMode]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      stopAudio();
      try {
        audioCtxRef.current?.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
      gainRef.current = null;
    };
  }, []);

  const start = async () => {
    setRunning(true);
    if (soundEnabled && soundMode !== "none") {
      await startAudio();
    }
  };

  const pause = () => {
    setRunning(false);
    stopAudio();
  };

  const reset = () => {
    setRunning(false);
    stopAudio();
    setRemainingSeconds(totalSeconds);
  };

  const stop = () => {
    setRunning(false);
    stopAudio();
    setRemainingSeconds(totalSeconds);
  };

  useImperativeHandle(
    ref,
    () => ({
      start,
      pause,
      reset,
      stop,
      isRunning: () => running,
    }),
    [running, totalSeconds, soundEnabled, soundMode, volume]
  );

  useEffect(() => {
    props.onRunningChange?.(running);
  }, [running, props]);

  const setPresetMinutes = (minutes: number) => {
    const next = clamp(minutes, 1, 120) * 60;
    setTotalSeconds(next);
    setRemainingSeconds(next);
    setRunning(false);
    stopAudio();
  };

  const completed = remainingSeconds === 0;

  return (
    <Card className={cn(compact ? "p-3" : "p-4", props.className)}>
      {showHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={cn("font-semibold", compact ? "text-base" : "text-lg")}>Focus mode</div>
            <div className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              Timer + optional ambient sound loop
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn("flex items-end justify-between gap-3", showHeader ? (compact ? "mt-3" : "mt-4") : "mt-0")}>
        <div className={cn("font-mono tracking-tight", compact ? "text-3xl" : "text-4xl")}>
          {formatMMSS(remainingSeconds)}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!running ? (
            <Button size={compact ? "sm" : "default"} onClick={start} disabled={completed}>
              Start
            </Button>
          ) : (
            <Button size={compact ? "sm" : "default"} variant="secondary" onClick={pause}>
              Pause
            </Button>
          )}
          <Button size={compact ? "sm" : "default"} variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-3 gap-2", compact ? "mt-3" : "mt-4")}>
        <Button size={compact ? "sm" : "default"} variant="outline" onClick={() => setPresetMinutes(15)}>
          15m
        </Button>
        <Button size={compact ? "sm" : "default"} variant="outline" onClick={() => setPresetMinutes(25)}>
          25m
        </Button>
        <Button size={compact ? "sm" : "default"} variant="outline" onClick={() => setPresetMinutes(50)}>
          50m
        </Button>
      </div>

      <div className={cn("rounded-md border", compact ? "mt-4 p-2.5" : "mt-5 p-3")}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Sound loop</div>
            <div className="text-xs text-muted-foreground">Toggle ambient focus/meditation audio</div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={(v) => setSoundEnabled(Boolean(v))} />
        </div>

        <div className={cn("mt-3 grid gap-3", !soundEnabled && "opacity-50 pointer-events-none")}>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={soundMode === "brown" ? "default" : "outline"}
              onClick={() => setSoundMode("brown")}
            >
              Brown noise
            </Button>
            <Button
              type="button"
              size="sm"
              variant={soundMode === "tone" ? "default" : "outline"}
              onClick={() => setSoundMode("tone")}
            >
              Soft tone
            </Button>
            <Button
              type="button"
              size="sm"
              variant={soundMode === "none" ? "default" : "outline"}
              onClick={() => setSoundMode("none")}
            >
              Off
            </Button>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-medium">{volume}%</span>
            </div>
            <Slider value={[volume]} min={0} max={100} onValueChange={(v) => setVolume(v[0] ?? 40)} />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={startAudio}>
              Test sound
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={stopAudio}>
              Stop sound
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});
