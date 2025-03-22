class RoomListItem extends Phaser.GameObjects.Container {
  constructor(scene, x, y, room, onJoin, onDelete) {
    super(scene, x, y);

    // Widen the panel to accommodate the game mode icon
    const panel = scene.add.rectangle(0, 0, 450, 40, 0x333333, 0.6)
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on('pointerdown', onJoin);

    // Add game mode icon based on room.gameMode
    let iconKey;
    switch (room.gameMode) {
      case 'realtime':
        iconKey = 'realtimeIcon';
        break;
      case 'singleplayer':
        iconKey = 'botIcon';
        break;
      case 'turnbased':
        iconKey = 'turnbasedIcon';
        break;
      case 'local':
        iconKey = 'localIcon';
        break;
      default:
        iconKey = 'realtimeIcon'; // Default fallback
    }
    const icon = scene.add.image(-210, 0, iconKey).setOrigin(0.5).setScale(0.5);

    // Apply pixel-art font to all text elements
    const roomText = scene.add.text(-180, 0, room.name, { 
      fontFamily: 'Daydream', 
      fontSize: '18px', 
      fill: '#fff' 
    }).setOrigin(0, 0.5);
    const playerText = scene.add.text(100, 0, `${room.players}/${room.maxPlayers}`, {
      fontFamily: 'Daydream',
      fontSize: '18px',
      fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
    }).setOrigin(0.5);
    const statusText = scene.add.text(170, 0, room.status, {
      fontFamily: 'Daydream',
      fontSize: '16px',
      fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
    }).setOrigin(0, 0.5);

    this.add([panel, icon, roomText, playerText, statusText]);

    if (room.isCreator) {
      const deleteBtn = scene.add.image(180, 0, 'deleteIcon')
        .setOrigin(0.5)
        .setScale(0.5)
        .setInteractive()
        .on('pointerdown', onDelete);
      this.add(deleteBtn);
      addHoverEffect(scene, deleteBtn);
    }

    addHoverEffect(scene, panel);
  }
}

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    // Load pixel font
    // this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    
    // Load assets for the menu scene
    this.load.image('logo', 'assets/logo.png');
    this.load.image('createButton', 'assets/create-button.png');
    this.load.image('joinButton', 'assets/join-button.png');
    this.load.image('menuBg', 'assets/bg2.jpg');
    this.load.image('deleteIcon', 'assets/delete-icon.png');

    // Load sounds
    this.load.audio('clickSound', 'assets/click.mp3');

    // Load game mode icons
    this.load.image('realtimeIcon', 'assets/realtime-icon.png');
    this.load.image('turnbasedIcon', 'assets/turnbased-icon.png');
    this.load.image('botIcon', 'assets/bot-icon.png');
    this.load.image('localIcon', 'assets/local-icon.png');
  }

  create() {
    this.initializeVariables();
    this.setupBackgroundElements();
    this.particleManager = new ParticleManager(this);
    this.createUI();
    this.setupEventListeners();
  }

  initializeVariables() {
    this.width = this.cameras.main.width;
    this.height = this.cameras.main.height;
    this.clickSound = this.sound.add('clickSound');
    this.gameModes = [
      { id: 'realtime', name: 'BATTLE ROYALE', description: 'Real-time battle against other players', options: ['Public Match', 'VS AI'] },
      { id: 'turnbased', name: 'TACTICAL DUEL', description: 'Turn-based strategic word combat', options: ['Public Match', 'Local Multiplayer'] }
    ];
  }

  setupBackgroundElements() {
    // Add background image
    this.add.image(this.width/2, this.height/2, 'menuBg')
    .setDisplaySize(this.width, this.height)
    .setDepth(DEPTHS.BACKGROUND);
  }

  createUI() {
    this.createLogo();
    this.createButtons();
    this.displayUserID();
    this.createRoomListPanel();
  }

  createLogo() {
    // Add logo
    this.add.image(this.width / 2, 100, 'logo')
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_ELEMENTS);
  }

  createButtons() {
    const createBtn = this.add.image(this.width / 2, 240, 'createButton')
      .setOrigin(0.5)
      .setScale(0.7)
      .setInteractive()
      .setDepth(DEPTHS.UI_ELEMENTS)
      .on('pointerdown', () => {
        this.clickSound.play();
        this.showGameModeSelection(); // Updated to show game mode selection
      });
    addHoverEffect(this, createBtn);
  }

  showGameModeSelection() {
    const modalBg = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x000000, 0.7)
      .setDepth(DEPTHS.MODAL_BG)
      .setInteractive();
    
    const modalPanel = this.add.rectangle(this.width / 2, this.height / 2, 500, 400, 0x222222, 0.9)
      .setDepth(DEPTHS.MODAL);
    
    const title = this.add.text(this.width / 2, this.height / 2 - 160, 'SELECT GAME MODE', {
      fontFamily: 'Daydream',
      fontSize: '20px',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
    
    const gameMode1 = this.createGameModeOption(
      this.width / 2, 
      this.height / 2 - 80, 
      this.gameModes[0], 
      () => this.selectGameModeOption(0, modalElements)
    );
    
    const gameMode2 = this.createGameModeOption(
      this.width / 2, 
      this.height / 2 + 40, 
      this.gameModes[1], 
      () => this.selectGameModeOption(1, modalElements)
    );
    
    const closeBtn = this.add.text(this.width / 2 + 230, this.height / 2 - 180, 'X', {
      fontFamily: 'Daydream',
      fontSize: '20px',
      fill: '#ff0000'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL).setInteractive()
      .on('pointerdown', () => {
        this.clickSound.play();
        modalElements.forEach(el => el.destroy());
      });
    
    const modalElements = [modalBg, modalPanel, title, closeBtn, ...gameMode1, ...gameMode2];
  }

  createGameModeOption(x, y, gameMode, callback) {
    const elements = [];
    
    const panel = this.add.rectangle(x, y, 450, 100, 0x333333, 0.8)
      .setDepth(DEPTHS.MODAL)
      .setInteractive()
      .on('pointerdown', callback);
    elements.push(panel);
    
    const title = this.add.text(x, y - 30, gameMode.name, {
      fontFamily: 'Daydream',
      fontSize: '16px',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
    elements.push(title);
    
    const desc = this.add.text(x, y, gameMode.description, {
      fontFamily: 'Daydream',
      fontSize: '10px',
      fill: '#aaaaaa'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
    elements.push(desc);
    
    panel.on('pointerover', () => {
      panel.setFillStyle(0x444444, 0.8);
    });
    
    panel.on('pointerout', () => {
      panel.setFillStyle(0x333333, 0.8);
    });
    
    return elements;
  }

  selectGameModeOption(modeIndex, modalElements) {
    this.clickSound.play();
    
    modalElements.forEach(el => el.destroy());
    
    const gameMode = this.gameModes[modeIndex];
    
    const modalBg = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x000000, 0.7)
      .setDepth(DEPTHS.MODAL_BG)
      .setInteractive();
    
    const modalPanel = this.add.rectangle(this.width / 2, this.height / 2, 500, 400, 0x222222, 0.9)
      .setDepth(DEPTHS.MODAL);
    
    const title = this.add.text(this.width / 2, this.height / 2 - 160, gameMode.name, {
      fontFamily: 'Daydream',
      fontSize: '20px',
      fill: '#ffffff'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
    
    const subtitle = this.add.text(this.width / 2, this.height / 2 - 120, 'SELECT OPTION', {
      fontFamily: 'Daydream',
      fontSize: '14px',
      fill: '#aaaaaa'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
    
    const optionElements = [];
    
    gameMode.options.forEach((option, index) => {
      const y = this.height / 2 - 40 + index * 80;
      
      const optionPanel = this.add.rectangle(this.width / 2, y, 400, 60, 0x333333, 0.8)
        .setDepth(DEPTHS.MODAL)
        .setInteractive()
        .on('pointerdown', () => {
          this.clickSound.play();
          
          let actualMode;
          if (gameMode.id === 'realtime') {
            actualMode = index === 0 ? 'realtime' : 'singleplayer';
          } else { // turnbased
            actualMode = index === 0 ? 'turnbased' : 'local';
          }
          
          [modalBg, modalPanel, title, subtitle, closeBtn, ...optionElements].forEach(el => el.destroy());
          
          this.promptForRoomName(actualMode);
        });
      
      const optionText = this.add.text(this.width / 2, y, option, {
        fontFamily: 'Daydream',
        fontSize: '14px',
        fill: '#ffffff'
      }).setOrigin(0.5).setDepth(DEPTHS.MODAL);
      
      optionPanel.on('pointerover', () => {
        optionPanel.setFillStyle(0x444444, 0.8);
      });
      
      optionPanel.on('pointerout', () => {
        optionPanel.setFillStyle(0x333333, 0.8);
      });
      
      optionElements.push(optionPanel, optionText);
    });
    
    const closeBtn = this.add.text(this.width / 2 + 230, this.height / 2 - 180, 'X', {
      fontFamily: 'Daydream',
      fontSize: '20px',
      fill: '#ff0000'
    }).setOrigin(0.5).setDepth(DEPTHS.MODAL).setInteractive()
      .on('pointerdown', () => {
        this.clickSound.play();
        [modalBg, modalPanel, title, subtitle, closeBtn, ...optionElements].forEach(el => el.destroy());
        this.showGameModeSelection();
      });
  }

  promptForRoomName(gameMode) {
    const roomName = prompt('Enter room name:');
    if (roomName) {
      let maxPlayers;
      if (gameMode === 'singleplayer') {
        maxPlayers = 1; // VS AI
      } else {
        maxPlayers = 2; // Public Match or Local Multiplayer
      }
      window.socket.emit('createRoom', { name: roomName, settings: { maxPlayers, gameMode } });
    }
  }

  displayUserID() {
    if (window.playerId) {
      this.add.text(this.width - 20, 20, `ID: ${window.playerId.substring(0, 8)}...`, {
        fontFamily: 'Daydream',
        fontSize: '16px',
        fill: '#fff', // Assuming COLORS.TEXT_WHITE is '#fff'
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 }
      }).setOrigin(1, 0).setDepth(DEPTHS.UI_ELEMENTS);
    }
  }

  createRoomListPanel() {
    const panelY = 340;
    const panelHeight = 300;
    
    const panelBg = this.add.rectangle(this.width / 2, panelY + panelHeight/2, 500, panelHeight, 0x000000, 0.6)
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BG);
    
    this.add.text(this.width / 2, panelY + 15, 'Available Rooms:', {
      fontFamily: 'Daydream',
      fontSize: '24px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(DEPTHS.UI_ELEMENTS);
    
    this.roomListContainer = this.add.container(this.width / 2, panelY + 60);
    this.roomListContainer.setDepth(DEPTHS.UI_ELEMENTS);
    
    this.noRoomsText = this.add.text(0, 50, 'No rooms available. Create one!', {
      fontFamily: 'Daydream',
      fontSize: '18px',
      fill: '#aaa',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.roomListContainer.add(this.noRoomsText);
  }

  setupEventListeners() {
    window.onpopstate = () => {
      window.socket.emit('getRoomList');
    };

    window.socket.emit('getRoomList');
    
    window.socket.on('roomList', (roomList) => {
      this.updateRoomList(roomList);
    });
    
    window.socket.on('roomListUpdated', () => {
      window.socket.emit('getRoomList');
    });
    
    this.events.on('wake', () => {
      window.socket.emit('getRoomList');
    });
    
    window.socket.on('roomCreated', (data) => {
      window.socket.emit('joinRoom', data.roomId);
    });
    
    window.socket.on('joinedRoom', (data) => {
      window.socket.playerPosition = data.position;
      console.log('Joined room as:', window.socket.playerPosition);
      this.scene.start('WaitingScene', { roomId: data.roomId });
      this.scene.stop('MenuScene');
    });

    this.roomListRefreshTimer = this.time.addEvent({
      delay: 3000,
      callback: () => {
        window.socket.emit('getRoomList');
      },
      loop: true
    });
  }

  updateRoomList(roomList) {
    this.roomListContainer.removeAll(true);
  
    if (roomList.length === 0) {
      this.noRoomsText = this.add.text(0, 50, 'No rooms available. Create one!', {
        fontFamily: 'Daydream',
        fontSize: '18px',
        fill: '#aaa',
        fontStyle: 'italic'
      }).setOrigin(0.5);
      this.roomListContainer.add(this.noRoomsText);
      return;
    }
  
    roomList.forEach((room, index) => {
      const yPos = index * 50;
      const item = new RoomListItem(this, 0, yPos, room,
        () => {
          this.clickSound.play();
          window.socket.emit('joinRoom', room.id);
        },
        () => {
          this.clickSound.play();
          if (confirm(`Are you sure you want to delete room "${room.name}"?`)) {
            window.socket.emit('deleteRoom', room.id);
          }
        }
      );
      this.roomListContainer.add(item);
    });
  }

  shutdown() {
    if (this.particleManager) {
      this.particleManager.stop();
    }

    if (this.roomListRefreshTimer) {
      this.roomListRefreshTimer.remove();
    } 
    
    this.children.removeAll();
    window.socket.off('roomList');
    window.socket.off('roomListUpdated');
    window.socket.off('roomCreated');
    window.socket.off('joinedRoom');
    
    window.onpopstate = null;
    
    this.events.off('wake');
  }
}