export function setupSocketListeners(scene, gameState, uiComponents) {
  const { wordDisplay, playerHPBar, opponentHPBar } = uiComponents;
  
  // Get word
  window.socket.on('gameData', (data) => {
    console.log('Received gameData with word:', data.givenWord);
    gameState.givenWord = data.givenWord;
    window.givenWord = data.givenWord; // Store globally
    wordDisplay.wordText.setText(data.givenWord.toUpperCase());
  });

  // Get game state
  window.socket.on('gameState', (data) => {
    console.log('Received game state:', data);
    if (data.hp) {
      if (window.socket.playerPosition === 'player1') {
        gameState.playerHP = data.hp.player1;
        gameState.opponentHP = data.hp.player2;
      } else {
        gameState.playerHP = data.hp.player2;
        gameState.opponentHP = data.hp.player1;
      }
      playerHPBar.update(gameState.playerHP);
      opponentHPBar.update(gameState.opponentHP);
    }
    if (data.givenWord) {
      gameState.givenWord = data.givenWord;
      wordDisplay.wordText.setText(gameState.givenWord.toUpperCase());
    }
  });

  window.socket.on('updateHP', (data) => {
    if (data.hp) {
      if (window.socket.playerPosition === 'player1') {
        gameState.playerHP = data.hp.player1;
        gameState.opponentHP = data.hp.player2;
      } else {
        gameState.playerHP = data.hp.player2;
        gameState.opponentHP = data.hp.player1;
      }
      playerHPBar.update(gameState.playerHP);
      opponentHPBar.update(gameState.opponentHP);
    }
  });

  window.socket.on('wordResult', (result) => {
    // Clear any existing damage text
    if (scene.damageText && scene.damageText.active) {
        scene.damageText.destroy();
    }
    
    if (result.valid) {
        scene.damageText = scene.add.text(scene.screenWidth / 2, scene.screenHeight / 4, `Damage Dealt: ${result.damage}`, { 
            fontFamily: 'Daydream',
            fontSize: '24px',
            color: '#00ff00' 
        }).setOrigin(0.5).setDepth(100); // Higher depth to ensure visibility
        
        gameState.multiplier = result.increaseMultiplier ? gameState.multiplier + 0.2 : gameState.multiplier;
        scene.time.delayedCall(2000, () => {
            if (scene.damageText && scene.damageText.active) {
                scene.damageText.destroy();
            }
        });
        
        // Create fireball from player to opponent
        scene.createFireball({
            damage: result.damage,
            startX: scene.screenWidth / 2 - scene.castleXOffset,
            startY: scene.castleY - scene.castleSize * 0.2,
            targetX: scene.screenWidth / 2 + scene.castleXOffset,
            targetY: scene.castleY - scene.castleSize * 0.2,
            isPlayerFireball: true
        });
    } else {
        scene.damageText = scene.add.text(scene.screenWidth / 2, scene.screenHeight / 4, `Invalid Word: ${result.reason}`, { 
            fontFamily: 'Daydream',
            fontSize: '24px',
            color: '#ff0000' 
        }).setOrigin(0.5).setDepth(100); // Higher depth to ensure visibility
        
        gameState.multiplier = result.resetMultiplier ? 1.0 : gameState.multiplier;
        scene.time.delayedCall(2000, () => {
            if (scene.damageText && scene.damageText.active) {
                scene.damageText.destroy();
            }
        });
    }
});

  window.socket.on('gameEnded', (data) => {
    gameState.gameEnded = true;
    const isWinner = data.winner === window.playerId;
    
    // Create a more prominent end game message
    const endGameText = scene.add.text(
        scene.screenWidth / 2, 
        scene.screenHeight / 2, 
        isWinner ? 'You Win!' : 'You Lose!', 
        { 
            fontFamily: 'Daydream',
            fontSize: '48px', 
            color: isWinner ? '#ffff00' : '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }
    ).setOrigin(0.5).setDepth(10);
    
    // Add a home button to let players return to lobby when they want
    const homeButton = scene.add.image(
        scene.screenWidth / 2,
        scene.screenHeight / 2 + 100,
        'homeButton'
    ).setOrigin(0.5).setScale(0.3).setInteractive()
      .on('pointerdown', () => {
          scene.scene.start('MenuScene');
      });
      
    // Add hover effect to the button
    homeButton.on('pointerover', () => {
        homeButton.setScale(0.35);
    });
    homeButton.on('pointerout', () => {
        homeButton.setScale(0.3);
    });
    
    // Add text below the button
    scene.add.text(
        scene.screenWidth / 2,
        scene.screenHeight / 2 + 150,
        'Return to Lobby',
        {
            fontFamily: 'Daydream',
            fontSize: '16px',
            color: '#ffffff'
        }
    ).setOrigin(0.5);
  });


  window.socket.on('gameRestarted', (data) => {
    console.log('Game restarted:', data.message);
    gameState.reset();
    scene.scene.start('CountdownScene');
  });

  window.socket.on('opponentWordSuccess', (data) => {
    console.log('Opponent word success:', data);
    if (typeof scene.createFireball === 'function') {
      scene.createFireball({
        damage: data.damage,
        startX: scene.screenWidth / 2 + scene.castleXOffset,
        startY: scene.castleY - scene.castleSize * 0.2,
        targetX: scene.screenWidth / 2 - scene.castleXOffset,
        targetY: scene.castleY - scene.castleSize * 0.2,
        isPlayerFireball: false
      });
    } else {
      console.error('createFireball method not found on scene');
    }
  });
}

export function handleKeyDown(event, gameState, wordDisplay) {
  if (window.keySound) {
    window.keySound.play();
  }
  
  if (event.key === 'Enter' && gameState.playerInput) {
      window.socket.emit('submitWord', { word: gameState.playerInput.trim().toLowerCase(), multiplier: gameState.multiplier });
      gameState.playerInput = '';
      wordDisplay.inputText.setText('');
  } else if (event.key === 'Backspace') {
      gameState.playerInput = gameState.playerInput.slice(0, -1);
      wordDisplay.inputText.setText(gameState.playerInput);
  } else if (event.key.length === 1) {
      gameState.playerInput += event.key;
      wordDisplay.inputText.setText(gameState.playerInput);
  }
}