class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
      this.submittedWords = new Set();
      this.multiplier = 1;
      this.isPaused = false;

      this.castleYFraction = 0.8;
      this.castleXOffsetFraction = 0.4;
      this.castleSize = 250;
    }

    preload() {
        this.load.image('background', 'assets/background.png');
        this.load.image('castle_100', 'assets/castle_100.png');
        // this.load.image('castle_75', 'assets/castle_75.png');
        // this.load.image('castle_50', 'assets/castle_50.png');
        // this.load.image('castle_25', 'assets/castle_25.png');
        // this.load.image('castle_0', 'assets/castle_0.png');
      }

    create() {
      // Get screen dimensions
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const castleY = height * this.castleYFraction;
      const castleXOffset = width * this.castleXOffsetFraction;
      const castleSize = this.castleSize;

      
      // Background
      this.background = this.add.image(0, 0, 'background')
      .setOrigin(0)
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
      .setDepth(0);

      // Initialize HP
      this.playerHP = 100;
      this.opponentHP = 100;
      this.gameEnded = false;
      this.multiplier = 1.0; // Reset multiplier on create

      // CASTLES
      this.playerCastle = this.add.image(width / 2 - castleXOffset, castleY, 'castle_100')
      .setOrigin(0.5).setDisplaySize(castleSize, castleSize).setDepth(1);
      this.opponentCastle = this.add.image(width / 2 + castleXOffset, castleY, 'castle_100')
        .setOrigin(0.5).setDisplaySize(castleSize, castleSize).setDepth(1);

      // Castle labels
      this.add.text(width / 2 - castleXOffset, castleY + castleSize * 0.6, 'Your Castle', 
        { fontSize: Math.max(16, width * 0.018) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(2);
      this.add.text(width / 2 + castleXOffset, castleY + castleSize * 0.6, 'Opponents Castle', 
        { fontSize: Math.max(16, width * 0.018) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(2);

      // HP bar dimensions
      const barWidth = width * 0.15;
      const barHeight = 10;
      const barY = castleY - castleSize * 0.4;
      
      // Player HP bar
      this.playerHPBar = this.add.graphics().setDepth(2);
      this.playerHPBar.lineStyle(2, 0xffffff, 1);
      this.playerHPBar.strokeRect((width / 2 - castleXOffset) - barWidth / 2, barY, barWidth, barHeight);
      this.playerHPBar.fillStyle(0x00ff00, 1);
      this.playerHPBar.fillRect((width / 2 - castleXOffset) - barWidth / 2, barY, barWidth, barHeight);
      this.playerHPText = this.add.text(width / 2 - castleXOffset, barY - barHeight, '100', 
        { fontSize: Math.max(16, width * 0.016) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(2);

      // Opponent HP bar
      this.opponentHPBar = this.add.graphics().setDepth(2);
      this.opponentHPBar.lineStyle(2, 0xffffff, 1);
      this.opponentHPBar.strokeRect((width / 2 + castleXOffset) - barWidth / 2, barY, barWidth, barHeight);
      this.opponentHPBar.fillStyle(0xff0000, 1);
      this.opponentHPBar.fillRect((width / 2 + castleXOffset) - barWidth / 2, barY, barWidth, barHeight);
      this.opponentHPText = this.add.text(width / 2 + castleXOffset, barY - barHeight, '100', 
        { fontSize: Math.max(16, width * 0.016) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(2);

      // Word and input UI - make the word text bigger
      this.inputText = this.add.text(width * 0.5, height * 0.25, '', 
        { fontSize: Math.max(24, width * 0.028) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(3);
      this.damageText = this.add.text(width * 0.5, height * 0.18, '', 
        { fontSize: Math.max(20, width * 0.024) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(3);
      
      // Multiplier display
      this.multiplierText = this.add.text(width * 0.5, height * 0.32, 'Multiplier: x1.0', 
        { fontSize: Math.max(18, width * 0.02) + 'px', fill: '#fff' }).setOrigin(0.5).setDepth(3);
      
      // Game results
      this.resultText = this.add.text(width * 0.5, height * 0.5, '', 
        { fontSize: Math.max(40, width * 0.05) + 'px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3);
      this.resultText.setVisible(false);

      this.playerInput = ''; // Initialize player input
      this.givenWord = ''; // Will be set when received from server
      this.lastWordTime = Date.now(); // time of last successfull word
      
      // Word and input UI - make the word text bigger
      this.wordText = this.add.text(width * 0.5, height * 0.1, 'Waiting for word...', 
        { fontSize: Math.max(40, width * 0.05) + 'px', fill: '#fff' }).setOrigin(0.5);
      
      // Check if we already have the word from the global variable
      if (window.givenWord) {
        this.givenWord = window.givenWord;
        this.wordText.setText(this.givenWord);
        console.log('Using stored word:', this.givenWord);
      } else {
        this.givenWord = ''; // Will be set when received from server
      }
      
      this.time.addEvent({
        delay: 100, // Check every 1/10s
        callback: this.decayMultiplier,
        callbackScope: this,
        loop: true
      });

      // Socket listeners
      window.socket.on('gameRestarted', (data) => {
        console.log(data.message);
        this.scene.restart();
      });

      window.socket.on('gameData', (data) => {
        console.log('GameScene received game data with word:', data.givenWord);
        this.givenWord = data.givenWord;
        this.wordText.setText(this.givenWord);
      });

      window.socket.on('playerDisconnected', (data) => {
        console.log(data.message);
        this.isPaused = true; // Pause the game
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.waitingText = this.add.text(
          width / 2,
          height / 2 - 50,
          data.message,
          { fontSize: '24px', fill: '#ff0000' }
        ).setOrigin(0.5).setDepth(4);
        this.input.keyboard.removeAllListeners(); // Pause input
      });
      
      window.socket.on('playerReconnected', (data) => {
        console.log(data.message);
        if (this.waitingText) {
          this.waitingText.destroy();
        }
        this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 50,
          data.message,
          { fontSize: '24px', fill: '#00ff00' }
        ).setOrigin(0.5).setDepth(10);
        this.time.delayedCall(2000, () => {
          this.input.keyboard.on('keydown', this.handleKeyDown, this); // Resume input
        });
      });

      window.socket.on('resumeGame', (data) => {
        console.log(data.message);
        this.isPaused = false;
        this.input.keyboard.on('keydown', this.handleKeyDown, this); // Re-enable input
        if (this.waitingText) this.waitingText.destroy(); // Remove waiting message if present
      });
      
      window.socket.on('gameAbandoned', (data) => {
        console.log(data.message);
        this.waitingText.setText(data.message);
        const lobbyButton = this.add.rectangle(
          this.cameras.main.width / 2, 
          this.cameras.main.height / 2 + 50, 
          200, 
          50, 
          0x0000aa
        ).setDepth(4);
        const lobbyText = this.add.text(
          this.cameras.main.width / 2, 
          this.cameras.main.height / 2 + 50, 
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

      // Update HP bars based on server data
      window.socket.on('updateHP', (data) => {
        this.playerHP = data.yourHP;
        this.opponentHP = data.opponentHP;
        this.updatePlayerHPBar();
        this.updateOpponentHPBar();

        // Check for game end
        if (!this.gameEnded && (this.playerHP <=0 || this.opponentHP <=0)) {
          this.endGame();
        }
      });
      
      // Handle word validation result
      window.socket.on('wordResult', (result) => {
        if (result.valid) {
          this.damageText.setText(`Нанесено урона: ${result.damage}`);
          this.damageText.setColor('#00ff00');
          
          // Increase multiplier on successful word
          if (result.increaseMultiplier) {
            this.multiplier += 0.2;
            this.updateMultiplierDisplay();
            this.lastWordTime = Date.now();
          }
        } else {
          this.damageText.setText(`Недопустимое слово: ${result.reason}`);
          this.damageText.setColor('#ff0000');
          
          // Reset multiplier on failed word
          if (result.resetMultiplier) {
            this.multiplier = 1.0;
            this.updateMultiplierDisplay();
          }
        }
      });

      // Handle keyboard input
      this.input.keyboard.on('keydown', this.handleKeyDown, this);
    }

    updateMultiplierDisplay() {
      // Format multiplier to one decimal place
      const formattedMultiplier = this.multiplier.toFixed(3);
      this.multiplierText.setText(`Multiplier: x${formattedMultiplier}`);
      
      // Change color based on multiplier value
      if (this.multiplier > 2.0) {
        this.multiplierText.setColor('#ff9900'); // Orange for high multiplier
      } else if (this.multiplier > 1.0) {
        this.multiplierText.setColor('#00ff00'); // Green for increased multiplier
      } else {
        this.multiplierText.setColor('#ffffff'); // White for base multiplier
      }
    }

    updatePlayerHPBar() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const barWidth = width * 0.15;
      const barHeight = height * 0.02;
      const castleSize = Math.min(width, height) * 0.15;
      const castleY = height * 0.65;
      const barY = castleY - castleSize * 0.4;
      
      const hpPercentage = this.playerHP / 100;
      this.playerHPBar.clear();
      this.playerHPBar.lineStyle(2, 0xffffff, 1);
      this.playerHPBar.strokeRect(width * 0.075, barY, barWidth, barHeight);
      
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
      this.playerHPBar.fillRect(width * 0.075, barY, barWidth * hpPercentage, barHeight);
      this.playerHPText.setText(this.playerHP);
    }

    updateOpponentHPBar() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      const barWidth = width * 0.15;
      const barHeight = height * 0.02;
      const castleSize = Math.min(width, height) * 0.15;
      const castleY = height * 0.65;
      const barY = castleY - castleSize * 0.4;
      
      const hpPercentage = this.opponentHP / 100;
      this.opponentHPBar.clear();
      this.opponentHPBar.lineStyle(2, 0xffffff, 1);
      this.opponentHPBar.strokeRect(width * 0.775, barY, barWidth, barHeight);
      
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
      this.opponentHPBar.fillRect(width * 0.775, barY, barWidth * hpPercentage, barHeight);
      this.opponentHPText.setText(this.opponentHP);
    }

    handleKeyDown(event) {
      if (event.key === 'Enter') {
        if (this.playerInput) {
          if (this.playerInput.length < 3) {
            this.damageText.setText('Слово должно быть не менее 3 букв');
            this.damageText.setColor('#ff0000');
            this.multiplier = 1.0;
            this.updateMultiplierDisplay();
          } else if (this.playerInput.toLowerCase() === this.givenWord.toLowerCase()) {
            this.damageText.setText('Нельзя использовать исходное слово');
            this.damageText.setColor('#ff0000');
            this.multiplier = 1.0;
            this.updateMultiplierDisplay();
          } else if (this.submittedWords.has(this.playerInput.toLowerCase())) {
            this.damageText.setText('Это слово уже использовано');
            this.damageText.setColor('#ff0000');
            this.multiplier = 1.0;
            this.updateMultiplierDisplay();
          } else {
            window.socket.emit('submitWord', { 
              word: this.playerInput,
              multiplier: this.multiplier
            });
            this.submittedWords.add(this.playerInput.toLowerCase());
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

    endGame() {
      this.gameEnded = true;

      // Disable input
      this.input.keyboard.removeAllListeners();
      
      // Show winner message
      if (this.playerHP <= 0) {
        this.resultText.setText('You Lost!');
      } else {
        this.resultText.setText('You Won!');
      }
      this.resultText.setVisible(true);
      
      // Notify server about game end
      window.socket.emit('gameEnded', { winner: this.playerHP > 0 ? socket.id : null });
      window.socket.emit('requestGameStats');

      // Create buttons to return to lobby or restart
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      
      // Return to Lobby button
      const lobbyButton = this.add.rectangle(width * 0.3, height * 0.65, 200, 50, 0x0000aa);
      const lobbyText = this.add.text(width * 0.3, height * 0.65, 'Return to Lobby', 
        { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
      lobbyButton.setInteractive();
      
      // Restart Game button
      const restartButton = this.add.rectangle(width * 0.7, height * 0.65, 200, 50, 0x00aa00);
      const restartText = this.add.text(width * 0.7, height * 0.65, 'Restart Game', 
        { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
      restartButton.setInteractive();
      
      // Button event handlers
      lobbyButton.on('pointerdown', () => {
        this.cleanupSocketListeners();
        this.scene.start('MenuScene');
      });
      
      restartButton.on('pointerdown', () => {
        window.socket.emit('restartGame');
      });
      
      this.statsContainer = this.add.container(width * 0.5, height * 0.75).setDepth(4);
      
      window.socket.on('gameStats', (stats) => {
        this.displayGameStats(stats);
      });
    }

    // Clean up socket listeners when returning to lobby
    cleanupSocketListeners() {
      window.socket.off('gameData');
      window.socket.off('updateHP');
      window.socket.off('wordResult');
      window.socket.off('gameStats');
      window.socket.off('gameRestarted');
    }

    // Display game statistics
    displayGameStats(stats) {
      // Clear any existing stats
      this.statsContainer.removeAll();
      
      const width = this.cameras.main.width;
      const maxHeight = this.cameras.main.height * 0.2;
      
      // Create scrollable area for stats
      const background = this.add.rectangle(0, 0, width * 0.8, maxHeight, 0x333333, 0.9);
      this.statsContainer.add(background);
      
      // Add close button
      const closeButton = this.add.circle(width * 0.4 - 15, -maxHeight/2 + 15, 12, 0xff0000).setDepth(4);
      const closeX = this.add.text(width * 0.4 - 15, -maxHeight/2 + 15, 'X', 
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
      const col1X = -width * 0.3;
      const col2X = 0;
      const col3X = width * 0.3;
      
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
      
      // Check if stats data exists before trying to display it
      if (stats.yourUniqueWords && stats.yourUniqueWords.length > 0) {
        stats.yourUniqueWords.slice(0, 5).forEach((word, index) => {
          const text = this.add.text(col1X, yPos + index * lineHeight, 
            `${word.word} (${word.damage})`, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
          this.statsContainer.add(text);
        });
      } else {
        const text = this.add.text(col1X, yPos, 'No unique words', 
          { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
        this.statsContainer.add(text);
      }
      
      if (stats.commonWords && stats.commonWords.length > 0) {
        stats.commonWords.slice(0, 5).forEach((word, index) => {
          const text = this.add.text(col2X, yPos + index * lineHeight, 
            `${word.word}`, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
          this.statsContainer.add(text);
        });
      } else {
        const text = this.add.text(col2X, yPos, 'No common words', 
          { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
        this.statsContainer.add(text);
      }
      
      if (stats.opponentUniqueWords && stats.opponentUniqueWords.length > 0) {
        stats.opponentUniqueWords.slice(0, 5).forEach((word, index) => {
          const text = this.add.text(col3X, yPos + index * lineHeight, 
            `${word.word} (${word.damage})`, { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
          this.statsContainer.add(text);
        });
      } else {
        const text = this.add.text(col3X, yPos, 'No unique words', 
          { fontSize: '16px', fill: '#fff' }).setOrigin(0.5).setDepth(4);
        this.statsContainer.add(text);
      }
    }

    decayMultiplier() {
      if (this.gameEnded || this.isPaused) return;
      
      const currentTime = Date.now();
      const timeSinceLastWord = currentTime - this.lastWordTime;
      
      if (this.multiplier > 1.0) {
        this.multiplier = Math.max(1.0, this.multiplier*0.999);
        this.updateMultiplierDisplay();
      }
    }
  }