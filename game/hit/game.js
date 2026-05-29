// Phaser 3 Hit Mule - no external assets (procedural textures)
// Author: ChatGPT

(() => {
  const WIDTH = 900;
  const HEIGHT = 600;
  const GRID_ROWS = 3;
  const GRID_COLS = 4;
  const ROUND_SECONDS = 60;

  let soundOn = true;
  const startBtn = document.getElementById('startBtn');
  const soundToggle = document.getElementById('soundToggle');
  soundToggle.addEventListener('change', () => (soundOn = soundToggle.checked));

  class GameScene extends Phaser.Scene {
    constructor() {
      super('game');
      this.holes = [];
      this.activeMules = new Map(); // key=index, value=object
      this.score = 0;
      this.timeLeft = ROUND_SECONDS;
      this.combo = 0;
      this.stunnedUntil = 0;
    }

    preload() {}

    create() {
      this.createTextures();
      // Background
      this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0x0b1220).setAlpha(1);

      // UI bar
      const bar = this.add.rectangle(WIDTH/2, 40, WIDTH-20, 58, 0x0e1729).setStrokeStyle(2, 0x1f2937).setOrigin(0.5);
      this.scoreText = this.add.text(34, 24, 'Score: 0', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e6edf3' });
      this.timeText = this.add.text(WIDTH/2 - 40, 24, 'Time: 60.0', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e6edf3' });
      this.comboText = this.add.text(WIDTH - 180, 24, 'Combo x1', { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#22c55e' });

      // Grid of holes
      const padX = 90, padY = 110;
      const gridW = WIDTH - padX*2;
      const gridH = HEIGHT - padY*1.2 - 40;
      const cellW = gridW / GRID_COLS;
      const cellH = gridH / GRID_ROWS;

      for (let r=0; r<GRID_ROWS; r++) {
        for (let c=0; c<GRID_COLS; c++) {
          const x = padX + cellW*(c+0.5);
          const y = 100 + cellH*(r+0.6);
          const holeBase = this.add.image(x, y, 'hole').setScale(1).setDepth(0);
          this.holes.push({ x, y, base: holeBase });
        }
      }

      // Input handler at scene level
      this.input.on('gameobjectdown', (pointer, obj) => {
        if (!obj || !obj.getData('type')) return;
        if (this.isStunned()) return;
        const type = obj.getData('type');
        if (type === 'mule' || type === 'gold') {
          const idx = obj.getData('idx');
          this.hitMule(obj, type, idx);
        } else if (type === 'bomb') {
          this.hitBomb(obj);
        }
      });

      // Spawners
      this.muleTimer = this.time.addEvent({
        delay: 700, loop: true, callback: () => this.spawnSomething()
      });

      // Countdown
      this.countTimer = this.time.addEvent({
        delay: 100, loop: true, callback: () => this.tick()
      });

      // Start paused until Start button is clicked from DOM
      this.scene.pause();
      startBtn.onclick = () => {
        this.resetGame();
        this.scene.resume();
      };

      this.showOverlay('Hit Mule', 'Click Start to begin. Whack mules, avoid bombs!');
    }

    resetGame() {
      // Clean up existing mules/bombs
      this.activeMules.forEach((obj) => obj.destroy());
      this.activeMules.clear();
      this.score = 0;
      this.combo = 0;
      this.timeLeft = ROUND_SECONDS;
      this.stunnedUntil = 0;
      this.updateUI();
      this.hideOverlay();
    }

    createTextures() {
      // Hole
      const g1 = this.add.graphics();
      g1.fillStyle(0x0b0f14, 1);
      g1.fillEllipse(80, 35, 150, 45);
      g1.lineStyle(4, 0x1f2937, 1);
      g1.strokeEllipse(80, 35, 150, 45);
      g1.generateTexture('hole', 160, 70);
      g1.destroy();

      // Mule (donkey-ish head)
      const mule = this.add.graphics();
      mule.fillStyle(0x654321, 1); // head
      mule.fillEllipse(36, 42, 48, 44);
      mule.fillStyle(0x55321a, 1); // muzzle
      mule.fillEllipse(36, 52, 26, 20);
      mule.fillStyle(0xeeeeee, 1); // eyes
      mule.fillCircle(28, 36, 4);
      mule.fillCircle(44, 36, 4);
      mule.fillStyle(0x222222, 1); // pupils
      mule.fillCircle(28, 36, 2);
      mule.fillCircle(44, 36, 2);
      // ears
      mule.fillStyle(0x6a3a23, 1);
      mule.fillTriangle(22, 12, 28, 8, 26, 26);
      mule.fillTriangle(50, 12, 44, 8, 46, 26);
      mule.generateTexture('muleTex', 72, 72);
      mule.destroy();

      // Golden mule
      const gold = this.add.graphics();
      gold.fillStyle(0xf59e0b, 1);
      gold.fillEllipse(36, 42, 48, 44);
      gold.fillStyle(0xfbbf24, 1);
      gold.fillEllipse(36, 52, 26, 20);
      gold.fillStyle(0xffffff, 1);
      gold.fillCircle(28, 36, 4); gold.fillCircle(44, 36, 4);
      gold.fillStyle(0x222222, 1);
      gold.fillCircle(28, 36, 2); gold.fillCircle(44, 36, 2);
      gold.fillStyle(0xf59e0b, 1);
      gold.fillTriangle(22, 12, 28, 8, 26, 26);
      gold.fillTriangle(50, 12, 44, 8, 46, 26);
      gold.generateTexture('muleGoldTex', 72, 72);
      gold.destroy();

      // Bomb
      const b = this.add.graphics();
      b.fillStyle(0x0f172a, 1);
      b.fillCircle(24, 24, 22);
      b.lineStyle(4, 0x334155, 1);
      b.strokeCircle(24, 24, 22);
      // fuse
      b.lineStyle(5, 0xf87171, 1);
      b.beginPath(); b.moveTo(24,6); b.lineTo(38,0); b.strokePath();
      b.generateTexture('bombTex', 48, 48);
      b.destroy();

      // Spark (particles)
      const s = this.add.graphics();
      s.fillStyle(0xffffff, 1); s.fillCircle(3,3,3);
      s.generateTexture('spark', 6, 6); s.destroy();
    }

    spawnSomething() {
      if (this.timeLeft <= 0) return;
      // More frequent spawns later
      const activeCount = this.activeMules.size;
      const maxActive = 2 + Math.floor((ROUND_SECONDS - this.timeLeft) / 15); // scales 2..6
      if (activeCount >= maxActive) return;

      // pick empty hole
      const empties = this.holes.map((_, i) => i).filter(i => !this.activeMules.has(i));
      if (empties.length === 0) return;
      const idx = Phaser.Utils.Array.GetRandom(empties);
      const hole = this.holes[idx];

      // decide type: mostly mule, sometimes gold, sometimes bomb
      const roll = Math.random();
      let kind = 'mule';
      if (roll > 0.88) kind = 'bomb';
      else if (roll > 0.75) kind = 'gold';

      const tex = (kind === 'mule') ? 'muleTex' : (kind === 'gold') ? 'muleGoldTex' : 'bombTex';
      const sprite = this.add.image(hole.x, hole.y + 20, tex).setInteractive({ useHandCursor: true });
      sprite.setData('type', kind);
      sprite.setData('idx', idx);
      sprite.setDepth(10);

      // pop up animation
      this.tweens.add({
        targets: sprite,
        y: hole.y - 10,
        duration: 120,
        ease: 'Back.Out'
      });

      // auto hide
      const stay = kind === 'gold' ? 650 : kind === 'bomb' ? 800 : 900;
      this.time.delayedCall(stay, () => this.hideTarget(idx, sprite), null, this);

      this.activeMules.set(idx, sprite);
    }

    hideTarget(idx, sprite) {
      if (!sprite || !sprite.active) return;
      this.tweens.add({
        targets: sprite,
        y: sprite.y + 28,
        alpha: 0.2,
        duration: 120,
        onComplete: () => {
          sprite.destroy();
          this.activeMules.delete(idx);
        }
      });
    }

    hitMule(sprite, type, idx) {
      // particle pop
      const emitter = this.add.particles(sprite.x, sprite.y, 'spark', {
        speed: { min: 100, max: 240 }, angle: { min: 0, max: 360 }, lifespan: 260, quantity: 14, scale: { start: 1, end: 0 }
      });
      this.time.delayedCall(260, () => emitter.destroy());

      // score
      const base = (type === 'gold') ? 5 : 1;
      this.combo = Math.min(this.combo + 1, 20);
      const bonus = Math.floor(this.combo / 5); // +1 every 5 combo
      const gained = base + bonus;
      this.score += gained;
      this.floatText(sprite.x, sprite.y - 30, `+${gained}`);
      this.updateUI();
      this.playBeep(type === 'gold' ? 660 : 520);

      // remove
      sprite.disableInteractive();
      this.hideTarget(idx, sprite);
    }

    hitBomb(sprite) {
      this.combo = 0;
      this.score = Math.max(0, this.score - 3);
      this.updateUI();
      this.playBeep(140);
      this.cameraShake();
      // stun for 700ms
      this.stunnedUntil = this.time.now + 700;
      sprite.disableInteractive();
      this.hideTarget(sprite.getData('idx'), sprite);
    }

    isStunned() {
      return this.time.now < this.stunnedUntil;
    }

    cameraShake() {
      this.cameras.main.shake(120, 0.004);
      this.add.rectangle(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT, 0xff0000, 0.05).setDepth(999).setBlendMode('ADD')
        .setAlpha(0.3).setInteractive()
        .scene.tweens.add({ targets: this.children.getAll().slice(-1)[0], alpha: 0, duration: 160, onComplete: t => t.targets[0].destroy() });
    }

    floatText(x, y, text) {
      const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#e6edf3' }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y-26, alpha: 0, duration: 520, onComplete: () => t.destroy() });
    }

    playBeep(freq) {
      if (!soundOn) return;
      const ctx = this.sound.context;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.2);
    }

    updateUI() {
      this.scoreText.setText(`Score: ${this.score}`);
      this.comboText.setText(`Combo x${Math.max(1, Math.floor(1 + this.combo/1))}`);
    }

    tick() {
      if (this.timeLeft <= 0) return;
      this.timeLeft = Math.max(0, this.timeLeft - 0.1);
      this.timeText.setText(`Time: ${this.timeLeft.toFixed(1)}`);
      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }

    endRound() {
      this.scene.pause();
      const best = Math.max(this.score, Number(localStorage.getItem('hm_best') || 0));
      localStorage.setItem('hm_best', String(best));
      this.showOverlay('Time Up!', `Score: ${this.score}<br>Best: ${best}`);
    }

    showOverlay(title, subtitle) {
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `
        <style>
          .overlay {
            position: absolute; inset: 0; display: grid; place-items: center;
          }
          .modal {
            background: #0b1220; border:1px solid #1f2937; border-radius: 16px; padding: 18px 20px; text-align: center;
            color: #e6edf3; min-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,.45);
          }
          .modal h2 { margin: 0 0 8px; }
          .modal .sub { color: #94a3b8; margin-bottom: 8px; }
        </style>
        <div class="modal">
          <h2>${title}</h2>
          <div class="sub">${subtitle}</div>
          <div class="sub">Press <b>Start Game</b> to play again.</div>
        </div>`;
      // Anchor to game container
      document.getElementById('game').appendChild(overlay);
      this._overlay = overlay;
    }

    hideOverlay() {
      if (this._overlay) {
        this._overlay.remove();
        this._overlay = null;
      }
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: 'game',
    backgroundColor: '#0b1220',
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade', arcade: { debug: false } },
    audio: { disableWebAudio: false }
  };

  const game = new Phaser.Game(config);
  soundOn = soundToggle.checked;
})();
