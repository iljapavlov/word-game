export class HPBar {
  constructor(scene, x, y, width, height, initialHP) {
      this.scene = scene;
      this.graphics = scene.add.graphics().setDepth(2);
      this.text = scene.add.text(x + width / 2, y - height - 5, initialHP, {
          fontSize: '22px',
          fill: '#fff',
          fontStyle: 'bold',
          stroke: '#000',
          strokeThickness: 2
      }).setOrigin(0.5).setDepth(2);
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.hp = initialHP;
      this.update();
  }

  update(hp = this.hp) {
      this.hp = hp;
      this.graphics.clear();
      this.graphics.lineStyle(2, 0xffffff, 1);
      this.graphics.strokeRect(this.x, this.y, this.width, this.height);
      const hpPercentage = this.hp / 100;
      let fillColor = hpPercentage > 0.5
          ? Phaser.Display.Color.GetColor(Math.floor(255 * (hpPercentage - 0.5) * 2), 255, 0)
          : Phaser.Display.Color.GetColor(255, Math.floor(255 * hpPercentage * 2), 0);
      this.graphics.fillStyle(fillColor, 1);
      this.graphics.fillRect(this.x, this.y, this.width * hpPercentage, this.height);
      this.text.setText(this.hp);
  }
}