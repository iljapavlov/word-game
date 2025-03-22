class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    
    // Game state
    this.submittedWords = new Set();
    this.multiplier = 1.0;
    this.isPaused = false;
    this.gameEnded = false;
    this.playerInput = '';
    this.givenWord = '';
    this.lastWordTime = 0;
    
    // Player stats
    this.playerHP = 100;
    this.opponentHP = 100;
    
    // Base dimensions for calculations
    this.baseWidth = 800;
    this.baseHeight = 800;
    
    // UI layout constants
    this.castleYFraction = 0.8;
    this.castleXOffsetFraction = 0.4;
    this.castleSizeFraction = 0.25;
    this.hpBarWidthFraction = 0.15;
    this.hpBarHeightFraction = 0.015;
  }

initLayoutValues() {
  // Get the game's dimensions (as defined in the config)
  this.screenWidth = this.baseWidth;
  this.screenHeight = this.baseHeight;
  
  // Calculate positions based on fractions of screen dimensions
  this.castleY = this.screenHeight * this.castleYFraction;
  this.castleXOffset = this.screenWidth * this.castleXOffsetFraction;
  this.castleSize = this.screenHeight * this.castleSizeFraction;
  this.hpBarWidth = this.screenWidth * this.hpBarWidthFraction;
  this.hpBarHeight = this.screenHeight * this.hpBarHeightFraction;
  this.hpBarYOffset = this.castleY - this.castleSize * 0.4;
  
  // Center HP bars on castles
  this.playerHPBarX = this.screenWidth / 2 - this.castleXOffset - this.hpBarWidth / 2;
  this.opponentHPBarX = this.screenWidth / 2 + this.castleXOffset - this.hpBarWidth / 2;
}

  preload() {
      this.load.image('background', 'assets/bg2.jpg');
      this.load.image('castle_100', 'assets/castle_100.png');
      this.load.image('homeButton', 'assets/home-button.png');
      this.load.image('wordBackground', 'assets/word-bg.png');

      // sounds
      this.load.audio('fireballSound', 'assets/fireball.mp3');
      this.load.audio('hitSound', 'assets/hit.mp3');
      this.load.audio('keySound', 'assets/key.mp3');
      // this.load.audio('backgroundMusic', 'assets/background-music.mp3');
  }

  create() {
      console.log('My playerPosition:', window.socket.playerPosition);
      // Enable physics
      this.physics.world.setBounds(0, 0, this.baseWidth, this.baseHeight);
    
      // Initialize layout values
      this.initLayoutValues();
      
      // Create UI elements
      this.createBackground();
      this.createCastles();
      this.createHPBars();
      this.createGameUI();
      this.createHomeButton();

      this.particleManager = new ParticleManager(this); 

      // Initialize sounds
      this.fireballSound = this.sound.add('fireballSound');
      this.hitSound = this.sound.add('hitSound');
      this.keySound = this.sound.add('keySound', { volume: 0.5 });
      // this.backgroundMusic = this.sound.add('backgroundMusic', {
      //     loop: true,
      //     volume: 0.5
      // });
      
      // // Start background music
      // this.backgroundMusic.play();
    
      // Initialize game state - Get HP values from server if available
      this.initGameState();
      
      // Setup timers
      this.setupTimers();
      
      // Setup socket event handlers
      this.setupSocketListeners();
      
      // Setup keyboard input
      this.input.keyboard.on('keydown', this.handleKeyDown, this);
      
      // Request current game state (including HP) when joining
      window.socket.emit('requestGameState');
  }
  
  createBackground() {
      this.background = this.add.image(0, 0, 'background')
          .setOrigin(0)
          .setDisplaySize(this.screenWidth, this.screenHeight)
          .setDepth(0);
  }
  
  createCastles() {
      // Castle images
      this.playerCastle = this.add.image(
          this.screenWidth / 2 - this.castleXOffset, 
          this.castleY, 
          'castle_100'
      ).setOrigin(0.5).setDisplaySize(this.castleSize, this.castleSize).setDepth(1);
      
      this.opponentCastle = this.add.image(
          this.screenWidth / 2 + this.castleXOffset, 
          this.castleY, 
          'castle_100'
      ).setOrigin(0.5).setDisplaySize(this.castleSize, this.castleSize).setDepth(1);
      
      // Castle labels
      const fontSize = 20;
      
      this.playerCastleLabel = this.add.text(
          this.screenWidth / 2 - this.castleXOffset, 
          this.castleY + this.castleSize * 0.6, 
          'Your Castle', 
          { fontSize: fontSize + 'px', fill: '#fff' }
      ).setOrigin(0.5).setDepth(2);
    
      this.opponentCastleLabel = this.add.text(
          this.screenWidth / 2 + this.castleXOffset, 
          this.castleY + this.castleSize * 0.6, 
          'Opponents Castle', 
          { fontSize: fontSize + 'px', fill: '#fff' }
      ).setOrigin(0.5).setDepth(2);
  }
  
  createHPBars() {
      const fontSize = 22;
      
      // Player HP bar
      this.playerHPBar = this.add.graphics().setDepth(2);
      this.playerHPText = this.add.text(
          this.playerHPBarX + this.hpBarWidth / 2, 
          this.hpBarYOffset - this.hpBarHeight - 5, 
          '100', 
          { 
            fontSize: fontSize + 'px', 
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(2);
      
      // Opponent HP bar
      this.opponentHPBar = this.add.graphics().setDepth(2);
      this.opponentHPText = this.add.text(
          this.opponentHPBarX + this.hpBarWidth / 2, 
          this.hpBarYOffset - this.hpBarHeight - 5, 
          '100', 
          { 
            fontSize: fontSize + 'px', 
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(2);
      
      // Initial render of HP bars
      this.updatePlayerHPBar();
      this.updateOpponentHPBar();
  }
  
  createGameUI() {
      // Main word
      this.wordBackground = this.add.image(
        this.screenWidth * 0.5,
        this.screenHeight * 0.15,
        'wordBackground'
    ).setOrigin(0.5).setDepth(2).setDisplaySize(this.screenWidth * 0.9, 150);

      this.wordText = this.add.text(
          this.screenWidth * 0.5, 
          this.screenHeight * 0.15, 
          'Waiting for word...', 
          { fontSize: '50px', fill: '#000', fontStyle: 'bold', letterSpacing:8 }
      ).setOrigin(0.5).setDepth(3);
      
      // Input text display
      this.inputText = this.add.text(
        this.screenWidth * 0.5, 
        this.screenHeight * 0.3, 
        '', 
        { 
            fontSize: '40px', 
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }
    ).setOrigin(0.5).setDepth(3);
      
      // Damage text
      this.damageText = this.add.text(
          this.screenWidth * 0.5, 
          this.screenHeight * 0.18, 
          '', 
          { fontSize: '24px', fill: '#fff' }
      ).setOrigin(0.5).setDepth(3);
      
      // Multiplier display (initially hidden since multiplier starts at 1)
      this.multiplierText = this.add.text(
        this.screenWidth * 0.5, 
        this.screenHeight * 0.32, 
        'Multiplier: x1.0', 
        { 
            fontSize: '20px', 
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3
        }
    ).setOrigin(0.5).setDepth(3).setVisible(false);
      
      // Game results (hidden initially)
      this.resultText = this.add.text(
          this.screenWidth * 0.5, 
          this.screenHeight * 0.5, 
          '', 
          { fontSize: '48px', fill: '#fff', fontStyle: 'bold' }
      ).setOrigin(0.5).setDepth(3).setVisible(false);
  }
  
  initGameState() {
      this.lastWordTime = Date.now();
      
      if (window.givenWord) {
          this.givenWord = window.givenWord;
          this.wordText.setText(this.givenWord.toUpperCase());
          console.log('Using stored word:', this.givenWord);
      } else {
        // Request the word from the server if not available
        window.socket.emit('requestGameState');
        console.log('Requesting game state because word is not available');
      }
  }
  
  setupTimers() {
      this.time.addEvent({
          delay: 100, // Check every 1/10s
          callback: this.decayMultiplier,
          callbackScope: this,
          loop: true
      });
  }
  
  setupSocketListeners() {
      window.socket.on('gameEnded', (data) => {
        this.gameEnded = true;
        const isWinner = data.winner === window.playerId;
        this.showGameEndMessage(isWinner);
      });

      window.socket.on('gameRestarted', (data) => {
          console.log(data.message);
          this.resetGame(data.givenWord);
      });

      window.socket.on('gameData', (data) => {
          console.log('GameScene received game data with word:', data.givenWord);
          this.givenWord = data.givenWord;
          this.wordText.setText(this.givenWord.toUpperCase());
      });

      window.socket.on('playerDisconnected', (data) => {
          console.log(data.message);
          this.isPaused = true;
          this.waitingText = this.add.text(
              this.screenWidth / 2,
              this.screenHeight / 2 - 50,
              data.message,
              { fontSize: '24px', fill: '#ff0000' }
          ).setOrigin(0.5).setDepth(4);
          this.input.keyboard.removeAllListeners();
      });
      
      window.socket.on('playerReconnected', (data) => {
          console.log(data.message);
          if (this.waitingText) {
              this.waitingText.destroy();
          }
          this.add.text(
              this.screenWidth / 2,
              this.screenHeight / 2 - 50,
              data.message,
              { fontSize: '24px', fill: '#00ff00' }
          ).setOrigin(0.5).setDepth(10);
          this.time.delayedCall(2000, () => {
              this.input.keyboard.on('keydown', this.handleKeyDown, this);
          });
      });

      window.socket.on('resumeGame', (data) => {
          console.log(data.message);
          this.isPaused = false;
          this.input.keyboard.on('keydown', this.handleKeyDown, this);
          if (this.waitingText) this.waitingText.destroy();
      });
      
      window.socket.on('gameAbandoned', (data) => {
          console.log(data.message);
          if (this.waitingText) {
              this.waitingText.setText(data.message);
          } else {
              this.waitingText = this.add.text(
                  this.screenWidth / 2,
                  this.screenHeight / 2 - 50,
                  data.message,
                  { fontSize: '24px', fill: '#ff0000' }
              ).setOrigin(0.5).setDepth(4);
          }
          
          const lobbyButton = this.add.rectangle(
              this.screenWidth / 2, 
              this.screenHeight / 2 + 50, 
              200, 
              50, 
              0x0000aa
          ).setDepth(4);
          
          const lobbyText = this.add.text(
              this.screenWidth / 2, 
              this.screenHeight / 2 + 50, 
              'Return to Lobby', 
              { fontSize: '20px', fill: '#fff' }
          ).setOrigin(0.5).setDepth(4);
          
          lobbyButton.setInteractive();
          lobbyButton.on('pointerdown', () => {
              this.cleanupSocketListeners();
              this.scene.start('MenuScene');
              this.scene.stop('GameScene');
          });
      });

      // Handle game state request response (for HP values)
      window.socket.on('gameState', (data) => {
          console.log('Received game state:', data);
          if (data.hp) {
            if (window.socket.playerPosition === 'player1') {
                  this.playerHP = data.hp.player1;
                  this.opponentHP = data.hp.player2;
              } else {
                  this.playerHP = data.hp.player2;
                  this.opponentHP = data.hp.player1;
              }
              this.updatePlayerHPBar();
              this.updateOpponentHPBar();
          }

          if (data.givenWord) {
            this.givenWord = data.givenWord;
            this.wordText.setText(this.givenWord.toUpperCase());
            console.log('Word set from game state:', this.givenWord);
          }
      });

      // Update HP bars based on server data
      // Listen for HP updates
      window.socket.on('updateHP', (data) => {
        if (data.hp) {
          // Update HP based on player position
          if (window.socket.playerPosition === 'player1') {
            this.playerHP = data.hp.player1;
            this.opponentHP = data.hp.player2;
          } else {
            this.playerHP = data.hp.player2;
            this.opponentHP = data.hp.player1;
          }
          
          // Update HP bars
          this.updatePlayerHPBar();
          this.updateOpponentHPBar();
          
          // Check for game end
          if ((this.playerHP <= 0 || this.opponentHP <= 0) && !this.gameEnded) {
            this.endGame();
          }
        }
      });
      
    window.socket.on('wordResult', (result) => {
        if (result.valid) {
          this.damageText.setText(`Нанесено урона: ${result.damage}`);
          this.damageText.setColor('#00ff00');
          
          // Handle successful word
          this.handleWordSuccess(result.damage);
          
          if (result.increaseMultiplier) {
            this.multiplier += 0.2;
            this.updateMultiplierDisplay();
            this.lastWordTime = Date.now();
          }
        } else {
          this.damageText.setText(`Недопустимое слово: ${result.reason}`);
          this.damageText.setColor('#ff0000');
          
          if (result.resetMultiplier) {
            this.multiplier = 1.0;
            this.updateMultiplierDisplay();
          }
        }
      });

      window.socket.on('opponentWordSuccess', (data) => {
        this.createFireball({
          damage: data.damage,
          startX: this.screenWidth / 2 + this.castleXOffset,
          startY: this.castleY - this.castleSize * 0.2,
          targetX: this.screenWidth / 2 - this.castleXOffset,
          targetY: this.castleY - this.castleSize * 0.2,
          isPlayerFireball: false
        });
      });
      
      window.socket.on('gameStats', (stats) => {
          this.displayGameStats(stats);
      });
  }

  resetGame(givenWord) {
    // Reset game state without scene restart
    this.gameEnded = false;
    this.submittedWords = new Set();
    this.multiplier = 1.0;
    this.playerInput = '';
    this.givenWord = givenWord;
    
    // Reset UI
    this.wordText.setText(this.givenWord);
    this.inputText.setText('');
    this.damageText.setText('');
    this.multiplierText.setVisible(false);
    this.resultText.setVisible(false);
    
    // Clear any end-game UI
    if (this.statsContainer) {
        this.statsContainer.destroy();
    }
    
    // Remove any existing end game buttons
    this.children.list.forEach(child => {
        if (child.type === 'Rectangle' && (child.fillColor === 0x0000aa || child.fillColor === 0x00aa00)) {
            child.destroy();
        }
    });
    
    // Re-enable keyboard input
    this.input.keyboard.on('keydown', this.handleKeyDown, this);
    
    // Request current game state including HP
    window.socket.emit('requestGameState');
  }

  showGameEndMessage(isWinner) {
    // Add stats button
    const statsButton = this.add.text(
      this.screenWidth * 0.5,
      this.screenHeight * 0.65,
      'View Game Stats',
      { fontSize: '24px', fill: '#fff', backgroundColor: '#00000080', padding: { x: 15, y: 10 } }
    ).setOrigin(0.5).setInteractive().on('pointerdown', () => {
      window.socket.emit('requestGameStats');
    });
    
  }

  updateMultiplierDisplay() {
    const formattedMultiplier = this.multiplier.toFixed(3);
    
    // Only show multiplier when it's greater than 1
    if (this.multiplier > 1.0) {
        this.multiplierText.setText(`X${formattedMultiplier}`);
        this.multiplierText.setVisible(true);
        
        // Scale based on multiplier value (1.0 to 2.0+ range)
        const baseScale = 1.0;
        const scaleIncrease = Math.min(1.0, (this.multiplier - 1.0)); // Cap at 2x size
        const newScale = baseScale + scaleIncrease;
        this.multiplierText.setScale(newScale);
        
        if (this.multiplier > 2.0) {
            this.multiplierText.setColor('#ff9900'); // Orange for high multiplier
            this.multiplierText.setStroke('#000', 4); // Thicker stroke for high multiplier
        } else {
            this.multiplierText.setColor('#00ff00'); // Green for increased multiplier
            this.multiplierText.setStroke('#000', 3); // Normal stroke
        }
    } else {
        this.multiplierText.setVisible(false);
    }
  }

  updatePlayerHPBar() {
      const hpPercentage = this.playerHP / 100;
      
      this.playerHPBar.clear();
      this.playerHPBar.lineStyle(2, 0xffffff, 1);
      this.playerHPBar.strokeRect(this.playerHPBarX, this.hpBarYOffset, this.hpBarWidth, this.hpBarHeight);
      
      // Color gradient based on HP percentage
      let fillColor;
      if (hpPercentage > 0.5) {
          // Green to yellow gradient (100% to 50%)
          const greenComponent = Math.floor(255 * (hpPercentage - 0.5) * 2);
          fillColor = Phaser.Display.Color.GetColor(greenComponent, 255, 0);
      } else {
          // Yellow to red gradient (50% to 0%)
          const redComponent = 255;
          const greenComponent = Math.floor(255 * hpPercentage * 2);
          fillColor = Phaser.Display.Color.GetColor(redComponent, greenComponent, 0);
      }
      
      this.playerHPBar.fillStyle(fillColor, 1);
      this.playerHPBar.fillRect(this.playerHPBarX, this.hpBarYOffset, this.hpBarWidth * hpPercentage, this.hpBarHeight);
      this.playerHPText.setText(this.playerHP);
  }

  updateOpponentHPBar() {
      const hpPercentage = this.opponentHP / 100;
      
      this.opponentHPBar.clear();
      this.opponentHPBar.lineStyle(2, 0xffffff, 1);
      this.opponentHPBar.strokeRect(this.opponentHPBarX, this.hpBarYOffset, this.hpBarWidth, this.hpBarHeight);
      
      // Color gradient based on HP percentage
      let fillColor;
      if (hpPercentage > 0.5) {
          // Green to yellow gradient (100% to 50%)
          const greenComponent = Math.floor(255 * (hpPercentage - 0.5) * 2);
          fillColor = Phaser.Display.Color.GetColor(greenComponent, 255, 0);
      } else {
          // Yellow to red gradient (50% to 0%)
          const redComponent = 255;
          const greenComponent = Math.floor(255 * hpPercentage * 2);
          fillColor = Phaser.Display.Color.GetColor(redComponent, greenComponent, 0);
      }
      
      this.opponentHPBar.fillStyle(fillColor, 1);
      this.opponentHPBar.fillRect(this.opponentHPBarX, this.hpBarYOffset, this.hpBarWidth * hpPercentage, this.hpBarHeight);
      this.opponentHPText.setText(this.opponentHP);
  }

  handleKeyDown(event) {
    this.keySound.play();
    if (event.key === 'Enter') {
        if (this.playerInput) {
            const submittedWord = this.playerInput.trim().toLowerCase();
            if (submittedWord.length < 3) {
                this.damageText.setText('Слово должно быть не менее 3 букв');
                this.damageText.setColor('#ff0000');
                this.multiplier = 1.0;
                this.updateMultiplierDisplay();
            } else if (submittedWord === this.givenWord.toLowerCase()) {
                this.damageText.setText('Нельзя использовать исходное слово');
                this.damageText.setColor('#ff0000');
                this.multiplier = 1.0;
                this.updateMultiplierDisplay();
            } else if (this.submittedWords.has(submittedWord.toLowerCase())) {
                this.damageText.setText('Это слово уже использовано');
                this.damageText.setColor('#ff0000');
                this.multiplier = 1.0;
                this.updateMultiplierDisplay();
            } else {
                window.socket.emit('submitWord', { 
                    word: submittedWord,
                    multiplier: this.multiplier
                });
                this.submittedWords.add(submittedWord);
            }
            this.playerInput = '';
            this.inputText.setText('');
        }
    } else if (event.key === 'Backspace') {
        this.playerInput = this.playerInput.slice(0, -1);
        this.inputText.setText(this.playerInput);
    } else if (event.key.length === 1) {
        this.playerInput += event.key;
        this.inputText.setText(this.playerInput);
    }
  }

createFireball(config) {
    // Default values
    const defaults = {
      damage: 10,
      startX: 0, 
      startY: 0,
      targetX: 0,
      targetY: 0,
      isPlayerFireball: true
    };
    
    // Merge defaults with provided config
    const settings = { ...defaults, ...config };
    
    console.log('Creating fireball:', settings);

    // Play fireball sound
    this.fireballSound.play();
    
    // Create fireball as a circle with color based on damage
    const damageRatio = Math.min(1, Math.abs(settings.damage - 20) / 20);
    const red = Math.floor(255 * damageRatio);
    const blue = Math.floor(255 * (1 - damageRatio));
    const color = Phaser.Display.Color.GetColor(red, 0, blue);
    const fireball = this.add.circle(settings.startX, settings.startY, 15, color);
  
    this.physics.add.existing(fireball);
    fireball.setDepth(5);
    
    // Add glow effect
    const glowSize = 25;
    const glow = this.add.circle(settings.startX, settings.startY, glowSize, 0xff6600, 0.4);
    glow.setDepth(4);
    
    // Trail effect
    fireball.trail = [];
    fireball.trailMax = 10;
    
    // Calculate velocity for arc trajectory
    const dx = settings.targetX - settings.startX;
    const dy = settings.targetY - settings.startY;
    const angle = Math.atan2(dy, dx);
    const speed = 500;
    
    // Add arc by setting negative y velocity
    const velX = Math.cos(angle) * speed;
    const velY = Math.sin(angle) * speed - 200;
    
    fireball.body.setVelocity(velX, velY);
    fireball.body.setGravityY(400);
    
    fireball.damage = settings.damage;
    fireball.targetCastle = settings.isPlayerFireball ? this.opponentCastle : this.playerCastle;
  
    // Update the glow position to follow the fireball
    this.time.addEvent({
      delay: 10,
      callback: () => {
        if (fireball.active) {
          glow.setPosition(fireball.x, fireball.y);
          
          // Add trail effect
          this.addTrailParticle(fireball);
          
          // Check for collision manually
          if (Phaser.Geom.Intersects.CircleToRectangle(
            new Phaser.Geom.Circle(fireball.x, fireball.y, 15),
            new Phaser.Geom.Rectangle(
              fireball.targetCastle.x - fireball.targetCastle.displayWidth/2,
              fireball.targetCastle.y - fireball.targetCastle.displayHeight/2,
              fireball.targetCastle.displayWidth,
              fireball.targetCastle.displayHeight
            )
          )) {
            this.fireballHit(fireball);
            glow.destroy();
          }
          
          // Destroy if it goes off screen
          if (fireball.x < 0 || fireball.x > this.screenWidth || 
              fireball.y < 0 || fireball.y > this.screenHeight) {
            fireball.destroy();
            glow.destroy();
            // Clean up trail
            fireball.trail.forEach(p => p.destroy());
          }
        } else {
          glow.destroy();
        }
      },
      callbackScope: this,
      loop: true
    });
    
    return fireball;
  }

  handleWordSuccess(damage) {
    // Calculate positions
    const startX = this.screenWidth / 2 - this.castleXOffset;
    const startY = this.castleY - this.castleSize * 0.2;
    const targetX = this.screenWidth / 2 + this.castleXOffset;
    const targetY = this.castleY - this.castleSize * 0.2;
    
    // Create the player's fireball
    this.createFireball({
        damage: damage,
        startX: startX,
        startY: startY,
        targetX: targetX,
        targetY: targetY,
        isPlayerFireball: true
    });
    
    // Send data to server (so opponent can see it too)
    window.socket.emit('wordSuccess', {
        damage: damage,
        startX: startX,
        startY: startY,
        targetX: targetX,
        targetY: targetY
    });
}

addTrailParticle(fireball) {
    // Create a smaller circle for the trail
    const damageRatio = Math.min(1, Math.abs(fireball.damage - 20) / 20); // Same ratio as fireball
    const red = Math.floor(255 * damageRatio);
    const blue = Math.floor(255 * (1 - damageRatio));
    const color = Phaser.Display.Color.GetColor(red * 0.6, 0, blue * 0.6); // Use darker shades for trail
    const trailParticle = this.add.circle(fireball.x, fireball.y, 10, color, 0.7);

    trailParticle.setDepth(3);
    
    // Add to trail array
    fireball.trail.push(trailParticle);
    
    // Fade out and shrink trail particle
    this.tweens.add({
        targets: trailParticle,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        onComplete: () => {
            trailParticle.destroy();
            // Remove from trail array
            const index = fireball.trail.indexOf(trailParticle);
            if (index > -1) {
                fireball.trail.splice(index, 1);
            }
        }
    });
    
    // Limit the number of trail particles
    if (fireball.trail.length > fireball.trailMax) {
        const oldestParticle = fireball.trail.shift();
        oldestParticle.destroy();
    }
}

fireballHit(fireball) {
  this.fireballSound.stop();
  this.hitSound.play();

  const damageText = this.add.text(fireball.x, fireball.y, '-' + fireball.damage, 
      { fontSize: '48px', fontStyle: 'bold', fill: '#ff0000' }).setOrigin(0.5).setDepth(6);
  this.cameras.main.shake(200, 0.005 * fireball.damage);

  // Notify server that fireball has hit
  window.socket.emit('fireballHit', {
    damage: fireball.damage,
    targetIsPlayer: fireball.targetCastle === this.playerCastle
  });
  
  // Animate damage text
  this.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: function() { damageText.destroy(); }
  });
  
  fireball.trail.forEach(p => p.destroy());
  fireball.destroy();
}

  endGame() {
      this.gameEnded = true;
      this.input.keyboard.removeAllListeners();
      
      if (this.playerHP <= 0) {
          this.resultText.setText('You Lost!');
      } else {
          this.resultText.setText('You Won!');
      }
      this.resultText.setVisible(true);
      
      window.socket.emit('gameEnded', { winner: this.playerHP > 0 ? socket.id : null });
      window.socket.emit('requestGameStats');

      this.createEndGameButtons();
      
      this.statsContainer = this.add.container(this.screenWidth * 0.5, this.screenHeight * 0.75).setDepth(4);
  }
  
  createEndGameButtons() {
      // Return to Lobby button
      const lobbyButton = this.add.rectangle(
          this.screenWidth * 0.3, 
          this.screenHeight * 0.65, 
          200, 
          50, 
          0x0000aa
      ).setDepth(4);
      
      const lobbyText = this.add.text(
          this.screenWidth * 0.3, 
          this.screenHeight * 0.65, 
          'Return to Lobby', 
          { fontSize: '20px', fill: '#fff' }
      ).setOrigin(0.5).setDepth(4);
      
      lobbyButton.setInteractive();
      
      // Restart Game button
      const restartButton = this.add.rectangle(
          this.screenWidth * 0.7, 
          this.screenHeight * 0.65, 
          200, 
          50, 
          0x00aa00
      ).setDepth(4);
      
      const restartText = this.add.text(
          this.screenWidth * 0.7, 
          this.screenHeight * 0.65, 
          'Restart Game', 
          { fontSize: '20px', fill: '#fff' }
      ).setOrigin(0.5).setDepth(4);
      
      restartButton.setInteractive();
      
      // Button event handlers
      lobbyButton.on('pointerdown', () => {
          this.cleanupSocketListeners();
          this.scene.start('MenuScene');
      });
      
      restartButton.on('pointerdown', () => {
          window.socket.emit('restartGame');
      });
  }

    createHomeButton() {
      this.homeButton = this.add.image(40, 40, 'homeButton')
      .setOrigin(0.5)
      .setScale(0.2) // Changed from 0.6 to 0.2 (3x smaller)
      .setInteractive()
      .on('pointerdown', () => {
          this.returnToLobby();
      });
      
      addHoverEffect(this, this.homeButton)
    }

    setupBrowserBackButton() {
        // Handle browser back button
        window.onpopstate = () => {
            this.returnToLobby();
        };
    }

    returnToLobby() {
        // Clean up event listeners
        this.input.keyboard.removeAllListeners();
        this.cleanupSocketListeners();
        
        // Stop ALL scenes except the one we're going to
        const sceneKeys = ['GameScene', 'WaitingScene', 'CountdownScene'];
        sceneKeys.forEach(key => {
            if (this.scene.isActive(key)) {
                this.scene.stop(key);
            }
        });
        
        // Remove room ID from URL
        if (window.history && window.history.pushState) {
            window.history.pushState("", document.title, window.location.pathname);
        }
        
        // Return to lobby
        this.scene.start('MenuScene');
    }

    shutdown() {
      this.cleanupSocketListeners();
      window.onpopstate = null;
      this.input.keyboard.removeAllListeners();

      if (this.particleManager) {
        this.particleManager.stop();
      }

      // Stop the music when leaving the scene
      if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
        this.backgroundMusic.stop();
      }
    }

  cleanupSocketListeners() {
        window.socket.off('gameData');
        window.socket.off('updateHP');
        window.socket.off('wordResult');
        window.socket.off('gameStats');
        window.socket.off('gameRestarted');
        window.socket.off('playerDisconnected');
        window.socket.off('playerReconnected');
        window.socket.off('resumeGame');
        window.socket.off('gameAbandoned');
        window.socket.off('gameState');
  }

  displayGameStats(stats) {
      if (this.statsContainer) {
          this.statsContainer.removeAll();
      } else {
          this.statsContainer = this.add.container(this.screenWidth * 0.5, this.screenHeight * 0.75).setDepth(4);
      }
      
      const maxHeight = this.screenHeight * 0.2;
      
      // Create scrollable area for stats
      const background = this.add.rectangle(0, 0, this.screenWidth * 0.8, maxHeight, 0x333333, 0.9);
      this.statsContainer.add(background);
      
      // Add close button
      const closeButton = this.add.circle(this.screenWidth * 0.4 - 15, -maxHeight/2 + 15, 12, 0xff0000).setDepth(4);
      const closeX = this.add.text(this.screenWidth * 0.4 - 15, -maxHeight/2 + 15, 'X', 
          { fontSize: '16px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
      closeButton.setInteractive();
      closeButton.on('pointerdown', () => {
          this.statsContainer.setVisible(false);
      });
      this.statsContainer.add([closeButton, closeX]);

      // Title
      const title = this.add.text(0, -maxHeight/2 + 15, 'Game Statistics', 
          { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
      this.statsContainer.add(title);
      
      // Create columns for player words, common words, and opponent words
      const col1X = -this.screenWidth * 0.3;
      const col2X = 0;
      const col3X = this.screenWidth * 0.3;
      
      // Column headers
      const header1 = this.add.text(col1X, -maxHeight/2 + 50, 'Your Unique Words', 
          { fontSize: '18px', fill: '#00ff00' }).setOrigin(0.5).setDepth(4);
      const header2 = this.add.text(col2X, -maxHeight/2 + 50, 'Common Words', 
          { fontSize: '18px', fill: '#ffff00' }).setOrigin(0.5).setDepth(4);
      const header3 = this.add.text(col3X, -maxHeight/2 + 50, 'Opponent Unique Words', 
          { fontSize: '18px', fill: '#ff0000' }).setOrigin(0.5).setDepth(4);
      
      this.statsContainer.add([header1, header2, header3]);
      
      // Display top words by damage
      let yPos = -maxHeight/2 + 80;
      const lineHeight = 20;
      
      this.addStatsColumn(stats.yourUniqueWords, col1X, yPos, lineHeight, 'No unique words');
      this.addStatsColumn(stats.commonWords, col2X, yPos, lineHeight, 'No common words');
      this.addStatsColumn(stats.opponentUniqueWords, col3X, yPos, lineHeight, 'No unique words');
  }
  
  addStatsColumn(words, xPos, yPos, lineHeight, emptyMessage) {
      if (words && words.length > 0) {
          words.slice(0, 5).forEach((word, index) => {
              let displayText = word.word;
              if (word.damage !== undefined) {
                  displayText += ` (${word.damage})`;
              }
              
              const text = this.add.text(xPos, yPos + index * lineHeight, 
                  displayText, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
              this.statsContainer.add(text);
          });
      } else {
          const text = this.add.text(xPos, yPos, emptyMessage, 
              { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
          this.statsContainer.add(text);
      }
  }

  decayMultiplier() {
      if (this.gameEnded || this.isPaused) return;
      
      if (this.multiplier > 1.0) {
          this.multiplier = Math.max(1.0, this.multiplier * 0.999);
          this.updateMultiplierDisplay();
      }
  }
}