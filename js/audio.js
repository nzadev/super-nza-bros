export class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("snb_muted") === "1";
    this.currentTrack = null;
    this.bgmTimer = null;
    this.noteIndex = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("snb_muted", this.muted ? "1" : "0");
    if (this.muted) {
      this.stopBgm();
    } else if (this.lastRequestedTrack) {
      this.playBgm(this.lastRequestedTrack);
    }
    return this.muted;
  }

  tone(freq, duration, type = "square", volume = 0.12, slideTo = null, delay = 0) {
    if (this.muted || !this.ctx || freq <= 0) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.015);
  }

  noise(duration = 0.1, volume = 0.12, delay = 0) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  sfx(name) {
    this.unlock();
    if (this.muted || !this.ctx) return;
    switch (name) {
      case "jump":
        this.tone(240, 0.16, "square", 0.11, 560);
        break;
      case "super_jump":
        this.tone(190, 0.22, "square", 0.12, 680);
        break;
      case "spring":
        this.tone(220, 0.12, "triangle", 0.16, 520);
        this.tone(440, 0.22, "square", 0.13, 980, 0.08);
        break;
      case "coin":
        this.tone(987.77, 0.07, "square", 0.11);
        this.tone(1318.51, 0.24, "square", 0.11, null, 0.065);
        break;
      case "bump":
        this.tone(150, 0.09, "triangle", 0.18, 72);
        break;
      case "brick":
        this.noise(0.14, 0.18);
        this.tone(190, 0.11, "sawtooth", 0.12, 65);
        break;
      case "powerup_spawn":
        [330, 392, 494, 587, 659, 784].forEach((n, i) => {
          this.tone(n, 0.06, "square", 0.09, null, i * 0.045);
        });
        break;
      case "powerup":
        [392, 523, 659, 784, 1046.5].forEach((n, i) => {
          this.tone(n, 0.08, "square", 0.12, null, i * 0.055);
        });
        break;
      case "one_up":
        [659, 784, 1318, 1046, 1175, 1568].forEach((n, i) => {
          this.tone(n, 0.085, "square", 0.12, null, i * 0.065);
        });
        break;
      case "powerdown":
        [587, 440, 330, 220].forEach((n, i) => {
          this.tone(n, 0.08, "sawtooth", 0.12, null, i * 0.06);
        });
        break;
      case "stomp":
        this.tone(360, 0.09, "square", 0.13, 140);
        this.tone(540, 0.07, "triangle", 0.1, 720, 0.04);
        break;
      case "kick":
        this.noise(0.06, 0.14);
        this.tone(420, 0.1, "square", 0.13, 190);
        break;
      case "fireball":
        this.tone(760, 0.09, "triangle", 0.12, 260);
        break;
      case "checkpoint":
        [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
          this.tone(n, 0.1, "triangle", 0.15, null, i * 0.06);
        });
        break;
      case "flagpole":
        [262, 330, 392, 523, 659, 784, 1046].forEach((n, i) => {
          this.tone(n, 0.09, "square", 0.11, null, i * 0.065);
        });
        break;
      case "boss_roar":
        this.noise(0.26, 0.18);
        this.tone(135, 0.32, "sawtooth", 0.16, 58);
        break;
      case "explosion":
        this.noise(0.32, 0.22);
        this.tone(110, 0.3, "sawtooth", 0.16, 40);
        break;
      case "die":
        this.stopBgm(false);
        [587, 622, 587, 494, 440, 392, 262].forEach((n, i) => {
          this.tone(n, 0.12, "square", 0.13, null, i * 0.09);
        });
        break;
      case "victory":
        this.stopBgm(false);
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((n, i) => {
          this.tone(n, i === 6 ? 0.36 : 0.11, "square", 0.13, null, i * 0.1);
        });
        break;
      case "gameover":
        this.stopBgm(false);
        [523, 392, 330, 440, 494, 440, 415, 466, 415, 392].forEach((n, i) => {
          this.tone(n, 0.15, "triangle", 0.15, null, i * 0.12);
        });
        break;
    }
  }

  playBgm(trackName) {
    this.lastRequestedTrack = trackName;
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    if (this.currentTrack === trackName && this.bgmTimer) return;
    this.stopBgm(false);
    this.currentTrack = trackName;
    this.noteIndex = 0;

    const tracks = {
      overworld: {
        stepMs: 145,
        lead: [
          659, 659, 0, 659, 0, 523, 659, 0, 784, 0, 0, 0, 392, 0, 0, 0,
          523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 494, 0, 466, 440, 0,
          392, 659, 784, 880, 0, 698, 784, 0, 659, 0, 523, 587, 494, 0, 0, 0
        ],
        bass: [
          131, 0, 196, 0, 262, 0, 196, 0, 196, 0, 147, 0, 98, 0, 147, 0,
          131, 0, 196, 0, 165, 0, 131, 0, 175, 0, 196, 0, 185, 175, 131, 0,
          196, 0, 220, 0, 175, 0, 196, 0, 165, 0, 131, 147, 123, 0, 98, 0
        ]
      },
      underground: {
        stepMs: 165,
        lead: [
          262, 523, 220, 440, 233, 466, 0, 0,
          262, 523, 220, 440, 233, 466, 0, 0,
          175, 349, 147, 294, 156, 311, 0, 0,
          175, 349, 147, 294, 156, 311, 196, 220
        ],
        bass: [
          131, 0, 110, 0, 117, 0, 98, 0,
          131, 0, 110, 0, 117, 0, 98, 0,
          87, 0, 73, 0, 78, 0, 65, 0,
          87, 0, 73, 0, 78, 0, 98, 110
        ]
      },
      sky: {
        stepMs: 135,
        lead: [
          523, 659, 784, 1046, 988, 784, 659, 784,
          880, 784, 698, 659, 587, 659, 784, 0,
          523, 659, 784, 1046, 1175, 1046, 880, 784,
          698, 784, 880, 659, 587, 523, 523, 0
        ],
        bass: [
          262, 0, 330, 0, 392, 0, 330, 0,
          220, 0, 175, 0, 196, 0, 247, 0,
          262, 0, 330, 0, 294, 0, 220, 0,
          175, 0, 196, 0, 131, 196, 262, 0
        ]
      },
      castle: {
        stepMs: 120,
        lead: [
          294, 311, 294, 277, 294, 349, 294, 277,
          262, 277, 262, 247, 262, 311, 262, 247,
          330, 349, 330, 311, 330, 392, 330, 311,
          294, 0, 440, 415, 392, 370, 349, 311
        ],
        bass: [
          110, 110, 0, 110, 117, 117, 0, 117,
          104, 104, 0, 104, 98, 98, 0, 98,
          123, 123, 0, 123, 131, 131, 0, 131,
          147, 0, 110, 0, 98, 0, 87, 0
        ]
      },
      starman: {
        stepMs: 95,
        lead: [
          523, 523, 523, 587, 659, 0, 659, 587,
          523, 587, 659, 523, 494, 494, 587, 0,
          494, 494, 494, 523, 587, 0, 587, 523,
          494, 523, 587, 494, 523, 523, 659, 0
        ],
        bass: [
          196, 262, 330, 262, 196, 262, 330, 262,
          175, 220, 294, 220, 196, 247, 294, 247,
          196, 247, 294, 247, 196, 247, 294, 247,
          196, 262, 330, 262, 262, 196, 131, 0
        ]
      }
    };

    const data = tracks[trackName] || tracks.overworld;
    this.bgmTimer = window.setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== "running") return;
      const idx = this.noteIndex % data.lead.length;
      const leadNote = data.lead[idx];
      const bassNote = data.bass[idx % data.bass.length];
      if (leadNote > 0) {
        this.tone(leadNote, (data.stepMs / 1000) * 0.85, trackName === "castle" ? "sawtooth" : "square", 0.045);
      }
      if (bassNote > 0) {
        this.tone(bassNote, (data.stepMs / 1000) * 0.9, "triangle", 0.065);
      }
      this.noteIndex++;
    }, data.stepMs);
  }

  stopBgm(clearMemory = true) {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.currentTrack = null;
    if (clearMemory) {
      this.lastRequestedTrack = null;
    }
  }
}
