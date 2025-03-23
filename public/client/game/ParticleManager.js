// ParticleManager.js
class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.createPixelParticleTextures();
    this.createSakuraParticles();
    this.createSmokeParticles();
  }

  createPixelParticleTextures() {
    const baseColors = [0xffb7c5, 0xff9eb5, 0xffc0cb];
    for (let i = 1; i <= 3; i++) {
      const graphics = this.scene.make.graphics();
      const baseColor = baseColors[i - 1];

      if (i === 1) {
        graphics.fillStyle(baseColor);
        graphics.fillRect(2, 0, 4, 2); // top
        graphics.fillRect(0, 2, 2, 4); // left
        graphics.fillRect(6, 2, 2, 4); // right
        graphics.fillRect(2, 6, 4, 2); // bottom
        graphics.fillStyle(baseColor + 0x111111);
        graphics.fillRect(2, 2, 4, 4); // center
      } else if (i === 2) {
        graphics.fillStyle(baseColor);
        graphics.fillRect(3, 0, 2, 2); // top
        graphics.fillRect(0, 3, 2, 2); // left
        graphics.fillRect(6, 3, 2, 2); // right
        graphics.fillRect(3, 6, 2, 2); // bottom
        graphics.fillStyle(baseColor - 0x111111);
        graphics.fillRect(2, 2, 2, 2); // top-left
        graphics.fillRect(4, 2, 2, 2); // top-right
        graphics.fillRect(2, 4, 2, 2); // bottom-left
        graphics.fillRect(4, 4, 2, 2); // bottom-right
      } else {
        graphics.fillStyle(baseColor);
        graphics.fillRect(3, 1, 2, 6); // vertical
        graphics.fillRect(1, 3, 6, 2); // horizontal
        graphics.fillStyle(baseColor + 0x222222);
        graphics.fillRect(3, 3, 2, 2); // center
      }

      graphics.generateTexture('pixelSakura' + i, 8, 8);
      graphics.destroy();
    }
  }

  createSakuraParticles() {
    this.sakuraEmitters = [];
    const textures = ['pixelSakura1', 'pixelSakura2', 'pixelSakura3'];
    textures.forEach((texture) => {
      const emitter = this.scene.add.particles(texture).createEmitter({
        x: { min: 0, max: this.scene.cameras.main.width },
        y: 0,
        alpha: { min: 0.7, max: 1 },
        lifespan: 8000,
        speedX: { min: -20, max: 20 },
        speedY: { min: 20, max: 40 },
        accelerationY: 7,
        angle: { min: 0, max: 360 },
        rotate: { min: -0.5, max: 0.5 },
        scale: { start: 2.5, end: 1.5 },
        quantity: 0.2,
        blendMode: 'OVERLAY',
        frequency: 200,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, this.scene.cameras.main.width, 1) }
      });
      this.sakuraEmitters.push(emitter);
    });
    this.scene.input.setTopOnly(true);
  }

  createSmokeParticles() {
    // Create a pixelated smoke particle texture
    const smokeGraphics = this.scene.add.graphics();
    smokeGraphics.fillStyle(0x222222, 1); // Dark base color
    smokeGraphics.fillRect(0, 0, 24, 24); // Smaller square for pixelated look
    smokeGraphics.generateTexture('smokeParticle', 24, 24);
    smokeGraphics.clear();
    
    // Player castle smoke emitter
    this.playerSmokeParticles = this.scene.add.particles('smokeParticle');
    this.playerSmokeEmitter = this.playerSmokeParticles.createEmitter({
      x: this.scene.screenWidth / 2 - this.scene.castleXOffset,
      y: this.scene.castleY - this.scene.castleSize * 0.2,
      speed: { min: 30, max: 60 },
      angle: { min: 250, max: 290 },
      scale: { start: 2, end: 1.5 },
      alpha: { start: 0.7, end: 0 },
      tint: 0x444444,
      lifespan: { min: 2000, max: 4000 },
      quantity: 1.3,
      frequency: 2000,
      blendMode: 'NORMAL',
      depth: 200
    });
    
    // Opponent castle smoke emitter
    this.opponentSmokeParticles = this.scene.add.particles('smokeParticle');
    this.opponentSmokeEmitter = this.opponentSmokeParticles.createEmitter({
      x: this.scene.screenWidth / 2 + this.scene.castleXOffset,
      y: this.scene.castleY - this.scene.castleSize * 0.2, 
      speed: { min: 30, max: 60 },
      angle: { min: 250, max: 290 },
      scale: { start: 2, end: 1.5 },
      alpha: { start: 0.7, end: 0 },
      tint: 0x444444,
      lifespan: { min: 2000, max: 4000 },
      quantity: 1.3,
      frequency: 2000,
      blendMode: 'NORMAL',
      depth: 200
    });
    
    // Initially disable both emitters
    this.playerSmokeEmitter.stop();
    this.opponentSmokeEmitter.stop();
  }

  updateSmokeIntensity(playerHP, opponentHP, gameEnded) {
    if (gameEnded) return;
    
    // Calculate smoke intensity based on damage (0-100 HP)
    const playerDamage = 100 - playerHP;
    const opponentDamage = 100 - opponentHP;
    
    // Set player castle smoke
    if (playerDamage <= 0) {
      // No smoke at full health
      this.playerSmokeEmitter.stop();
    } else if (playerDamage < 20) {
      this.playerSmokeEmitter.start();
      this.playerSmokeEmitter.setFrequency(2000); // Very infrequent
    } else if (playerDamage < 50) {
      this.playerSmokeEmitter.start();
      this.playerSmokeEmitter.setFrequency(1000);
    } else if (playerDamage < 80) {
      this.playerSmokeEmitter.start();
      this.playerSmokeEmitter.setFrequency(700);
    } else {
      this.playerSmokeEmitter.start();
      this.playerSmokeEmitter.setFrequency(500); // More frequent for heavy damage
    }
    
    // Set opponent castle smoke
    if (opponentDamage <= 0) {
      // No smoke at full health
      this.opponentSmokeEmitter.stop();
    } else if (opponentDamage < 20) {
      this.opponentSmokeEmitter.start();
      this.opponentSmokeEmitter.setFrequency(2000); // Very infrequent
    } else if (opponentDamage < 50) {
      this.opponentSmokeEmitter.start();
      this.opponentSmokeEmitter.setFrequency(1000);
    } else if (opponentDamage < 80) {
      this.opponentSmokeEmitter.start();
      this.opponentSmokeEmitter.setFrequency(700);
    } else {
      this.opponentSmokeEmitter.start();
      this.opponentSmokeEmitter.setFrequency(500); // More frequent for heavy damage
    }
  }

  createExplosion(x, y, size = 1) {
    // Create explosion texture if it doesn't exist
    if (!this.scene.textures.exists('explosionParticle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xff6600, 1); // Orange color
      graphics.fillRect(0, 0, 8, 8);
      graphics.generateTexture('explosionParticle', 8, 8);
      graphics.destroy();
    }
    
    // Create particles for the explosion
    const particles = this.scene.add.particles('explosionParticle');
    
    // Main explosion
    const mainEmitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 30 , max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 10 * size, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [0xff0000, 0xff6600, 0xffff00], // Fire colors
      lifespan: { min: 600, max: 900 },
      quantity: 20 * size,
      blendMode: 'ADD'
    });
    
    // Smoke after explosion
    const smokeEmitter = particles.createEmitter({
      x: x,
      y: y,
      speed: { min: 50 * size, max: 100 * size },
      angle: { min: 0, max: 360 },
      scale: { start: 2 * size, end: 4 * size },
      alpha: { start: 0.4, end: 0 },
      tint: [0x333333, 0x555555],
      lifespan: { min: 1000, max: 2000 },
      quantity: 10 * size,
      frequency: 50,
      blendMode: 'NORMAL'
    });
    
    // Stop emitting after a short time
    this.scene.time.delayedCall(300, () => {
      mainEmitter.stop();
      smokeEmitter.stop();
    });
    
    // Auto-destroy after animation completes
    this.scene.time.delayedCall(2000, () => {
      particles.destroy();
    });
  }

  stop() {
    this.sakuraEmitters.forEach(emitter => emitter.stop());
    this.playerSmokeEmitter.stop();
    this.opponentSmokeEmitter.stop();
  }
}