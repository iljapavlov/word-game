class WaitingScene extends Phaser.Scene {
    constructor() {
      super({ key: 'WaitingScene' });
    }

    init(data) {
      this.roomId = data.roomId;
    }

    create() {
      this.waitingText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 2 - 50, 
        'Waiting for another player...', 
        { fontSize: '32px', fill: '#fff' }
      ).setOrigin(0.5);
      
      // Display room ID for sharing
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 50,
        `Room ID: ${this.roomId}`,
        { fontSize: '24px', fill: '#fff' }
      ).setOrigin(0.5);
      
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 100,
        'Share this ID with your friend',
        { fontSize: '20px', fill: '#aaa' }
      ).setOrigin(0.5);
    }
  }