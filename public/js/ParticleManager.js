// ParticleManager.js
class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.createPixelParticleTextures();
    this.createSakuraParticles();
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

  stop() {
    this.sakuraEmitters.forEach(emitter => emitter.stop());
  }
}