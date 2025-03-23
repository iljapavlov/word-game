export class WaitingScene extends Phaser.Scene {
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
        .setScale(0.2)
        .setInteractive()
        .on('pointerdown', () => {
            this.clickSound.play();
            this.returnToLobby();
      });
      addHoverEffect(this, this.homeButton)

      this.waitingText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 2 - 50, 
        'Waiting for another player...', 
        { fontSize: '32px', fill: '#fff', fontFamily: 'Daydream'}
      ).setOrigin(0.5);
      
      // Setup browser back button handling
      window.onpopstate = () => {
        this.returnToLobby();
      };

      // Make sure we're not adding duplicate listeners
      window.socket.off('startGame');
      window.socket.off('gameData');

      window.socket.on('startGame', (data) => {
        console.log('Game starting event received!', data);
        this.scene.start('CountdownScene');
        this.scene.stop('WaitingScene');
      });

      window.socket.on('gameData', (data) => {
        console.log('Received game data with word:', data.givenWord);
        window.givenWord = data.givenWord;
      });
      
      // Add debug info about our position
      console.log(`WaitingScene: I am ${window.socket.playerPosition} in room ${this.roomId}`);
    }
    
    returnToLobby() {
      window.socket.emit('returnToLobby');
      this.scene.start('MenuScene');
      this.scene.stop('WaitingScene');
    }
    
    shutdown() {
      window.socket.off('startGame');
      window.socket.off('gameData');
      window.onpopstate = null;
    }
}