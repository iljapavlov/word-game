export class WordDisplay {
  constructor(scene, screenWidth, screenHeight) {
    this.scene = scene;
    this.wordBackground = scene.add.image(screenWidth * 0.5, screenHeight * 0.15, 'wordBackground')
        .setOrigin(0.5).setDepth(2).setDisplaySize(screenWidth * 0.95, 180); // Larger background
    
    this.wordText = scene.add.text(screenWidth * 0.5, screenHeight * 0.15, 'Waiting for word...', {
        fontFamily: 'Daydream', // Ensure Daydream font is used
        fontSize: '40px', // Smaller font size
        fill: '#000',
        fontStyle: 'bold',
        letterSpacing: 6 // Slightly reduced letter spacing
    }).setOrigin(0.5).setDepth(3);
    
    this.inputText = scene.add.text(screenWidth * 0.5, screenHeight * 0.3, '', {
        fontFamily: 'Daydream',
        fontSize: '40px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);
    
    this.damageText = scene.add.text(screenWidth * 0.5, screenHeight * 0.18, '', {
        fontFamily: 'Daydream',
        fontSize: '24px',
        fill: '#fff'
    }).setOrigin(0.5).setDepth(3);
    
    this.multiplierText = scene.add.text(screenWidth * 0.5, screenHeight * 0.38, 'X1.0', {
        fontFamily: 'Daydream',
        fontSize: '24px',
        fill: '#fff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(3);
    
    // Check if we already have a word from the waiting scene
    if (window.givenWord) {
        this.wordText.setText(window.givenWord.toUpperCase());
    }
  }

  updateMultiplier(multiplier) {
    this.multiplierText.setText(`X${multiplier.toFixed(2)}`);
    
    if (multiplier > 1.0) {
        const scale = 1.0 + Math.min(0.5, (multiplier - 1.0) / 2);
        this.multiplierText.setScale(scale);
        this.multiplierText.setColor(multiplier > 2.0 ? '#ff9900' : '#00ff00');
        this.multiplierText.setStroke('#000', multiplier > 2.0 ? 4 : 3);
    } else {
        this.multiplierText.setScale(1.0);
        this.multiplierText.setColor('#ffffff');
        this.multiplierText.setStroke('#000', 3);
    }
  }
  
  showDamage(damage) {
    this.damageText.setText(`+${damage} damage!`);
    this.damageText.setVisible(true);
    
    this.scene.tweens.add({
      targets: this.damageText,
      alpha: 0,
      y: '-=50',
      duration: 1500,
      onComplete: () => {
        this.damageText.setAlpha(1);
        this.damageText.setY(this.damageText.y + 50);
        this.damageText.setVisible(false);
      }
    });
  }
  
  showError(message) {
    this.damageText.setText(message);
    this.damageText.setFill('#ff0000');
    this.damageText.setVisible(true);
    
    this.scene.tweens.add({
      targets: this.damageText,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        this.damageText.setAlpha(1);
        this.damageText.setFill('#ffffff');
        this.damageText.setVisible(false);
      }
    });
  }
  
  showGameOver(winner) {
    const text = winner === 'You' ? 'You Win!' : 'You Lose!';
    const color = winner === 'You' ? '#00ff00' : '#ff0000';
    
    this.scene.add.text(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2, text, {
      fontFamily: 'Daydream',
      fontSize: '64px',
      fill: color,
      stroke: '#000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(10);
  }
}