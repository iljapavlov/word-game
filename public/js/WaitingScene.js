class WaitingScene extends Phaser.Scene {
    constructor() {
      super({ key: 'WaitingScene' });
    }

    init(data) {
      this.roomId = data.roomId;
    }

    preload() {
      this.load.image('homeButton', 'assets/home-button.png');
      this.load.audio('clickSound', 'assets/click.mp3');
    }

    create() {
      this.clickSound = this.sound.add('clickSound');
      
      // Add home button in the top-left corner
      this.homeButton = this.add.image(40, 40, 'homeButton')
        .setOrigin(0.5)
        .setScale(0.6)
        .setInteractive()
        .on('pointerdown', () => {
          this.clickSound.play();
          this.returnToLobby();
        });
        
      // Add hover effect
      this.homeButton.on('pointerover', () => {
        this.homeButton.setScale(0.7);
      });
      
      this.homeButton.on('pointerout', () => {
        this.homeButton.setScale(0.6);
      });

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
      
      // Setup browser back button handling
      window.onpopstate = () => {
        this.returnToLobby();
      };
    }
    
    returnToLobby() {
      // Tell server we're leaving the room
      window.socket.emit('returnToLobby');
      
      // Remove room ID from URL
      if (window.history && window.history.pushState) {
        window.history.pushState("", document.title, window.location.pathname);
      }
      
      // Return to lobby
      this.scene.start('MenuScene');
      this.scene.stop('WaitingScene');
    }
    
    shutdown() {
      // Clean up browser back button handler
      window.onpopstate = null;
    }
}