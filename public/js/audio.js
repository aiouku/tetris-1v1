const ctx = new (window.AudioContext || window.webkitAudioContext)();

function play(fn) {
  // Resume context on user interaction (browser autoplay policy)
  if (ctx.state === 'suspended') ctx.resume();
  fn(ctx);
}

function tone(freq, duration, type = 'square', volume = 0.15, decay = true) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function noise(duration, volume = 0.1) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const audio = {
  move() {
    play(() => tone(200, 0.05, 'square', 0.08));
  },

  rotate() {
    play(() => tone(400, 0.08, 'square', 0.1));
  },

  drop() {
    play(() => {
      tone(150, 0.15, 'triangle', 0.2);
      noise(0.08, 0.15);
    });
  },

  hold() {
    play(() => {
      tone(300, 0.06, 'sine', 0.1);
      tone(450, 0.06, 'sine', 0.1);
    });
  },

  lineClear(count) {
    play(() => {
      if (count >= 4) {
        // Tetris!
        [523, 659, 784, 1047].forEach((f, i) => {
          setTimeout(() => tone(f, 0.2, 'square', 0.15), i * 60);
        });
      } else {
        tone(520, 0.1, 'square', 0.12);
        setTimeout(() => tone(680, 0.15, 'square', 0.12), 50);
      }
    });
  },

  garbage() {
    play(() => {
      tone(80, 0.2, 'sawtooth', 0.1);
      noise(0.1, 0.08);
    });
  },

  countdown() {
    play(() => tone(440, 0.15, 'sine', 0.15));
  },

  gameStart() {
    play(() => {
      [440, 554, 659].forEach((f, i) => {
        setTimeout(() => tone(f, 0.15, 'sine', 0.15), i * 100);
      });
    });
  },

  win() {
    play(() => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => tone(f, 0.25, 'sine', 0.12), i * 100);
      });
    });
  },

  lose() {
    play(() => {
      [400, 350, 300, 200].forEach((f, i) => {
        setTimeout(() => tone(f, 0.3, 'sawtooth', 0.08), i * 150);
      });
    });
  },

  gameOver() {
    play(() => {
      [300, 250, 200, 150].forEach((f, i) => {
        setTimeout(() => tone(f, 0.4, 'triangle', 0.1), i * 200);
      });
    });
  }
};
