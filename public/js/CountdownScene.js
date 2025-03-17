class CountdownScene extends Phaser.Scene {
    constructor() {
      super({ key: 'CountdownScene' });
    }
  
    create() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
  
      // Create countdown text
      this.countdownText = this.add.text(width / 2, height / 2, '3', {
        fontSize: '120px',
        fill: '#fff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
  
      // Get ready text
      this.add.text(width / 2, height / 2 - 150, 'Get Ready!', {
        fontSize: '48px',
        fill: '#fff'
      }).setOrigin(0.5);
  
      // Word display
      if (window.givenWord) {
        this.add.text(width / 2, height / 2 + 150, `Word: ${window.givenWord}`, {
          fontSize: '36px',
          fill: '#fff'
        }).setOrigin(0.5);
      }
  
      // Start countdown using setInterval
      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          this.countdownText.setText(count.toString());
        } else {
          this.countdownText.setText('GO!');
          clearInterval(countdownInterval);
          setTimeout(() => {
            this.scene.start('GameScene');
            this.scene.stop('CountdownScene');
          }, 500);
        }
      }, 1000);
    }
  }