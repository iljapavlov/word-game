export class CastleUI {
  constructor(scene, x, y, labelText, castleSize) {
      this.scene = scene;
      this.castle = scene.add.image(x, y, 'castle_100')
          .setOrigin(0.5)
          .setDisplaySize(castleSize, castleSize)
          .setDepth(1);
      this.label = scene.add.text(x, y + castleSize * 0.6, labelText, {
          fontFamily: 'Daydream',
          fontSize: '20px',
          fill: '#fff'
      }).setOrigin(0.5).setDepth(2);
  }
}