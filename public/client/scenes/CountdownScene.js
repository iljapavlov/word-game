export class CountdownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CountdownScene' });
  }
  
  create() {
    console.log('CountdownScene started');
    let timeLeft = 3;
    this.add.text(400, 400, timeLeft, { fontSize: '64px', color: '#ffffff', fontFamily: 'Daydream' }).setOrigin(0.5);
    this.time.addEvent({ 
      delay: 1000, 
      callback: () => {
        timeLeft--;
        if (timeLeft > 0) {
          this.children.list[0].setText(timeLeft);
        } else {
          console.log('Countdown finished, starting game scene');
          // Add debug to check if the scene exists in the registry
          console.log('Available scenes:', this.scene.manager.keys);
          this.scene.start('StandardGameScene');
        }
      }, 
      repeat: 2 
    });
  }
}