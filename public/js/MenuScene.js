class RoomListItem extends Phaser.GameObjects.Container {
  constructor(scene, x, y, room, onJoin, onDelete) {
    super(scene, x, y);

    const panel = scene.add.rectangle(0, 0, 400, 40, 0x333333, 0.6)
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on('pointerdown', onJoin);

    const roomText = scene.add.text(-180, 0, room.name, { fontSize: '18px', fill: '#fff' }).setOrigin(0, 0.5);
    const playerText = scene.add.text(100, 0, `${room.players}/${room.maxPlayers}`, {
      fontSize: '18px',
      fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
    }).setOrigin(0.5);
    const statusText = scene.add.text(170, 0, room.status, {
      fontSize: '16px',
      fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
    }).setOrigin(0, 0.5);

    this.add([panel, roomText, playerText, statusText]);

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
    // Load assets for the menu scene
    this.load.image('logo', 'assets/logo.png');
    this.load.image('createButton', 'assets/create-button.png');
    this.load.image('joinButton', 'assets/join-button.png');
    this.load.image('menuBg', 'assets/bg2.jpg');
    this.load.image('deleteIcon', 'assets/delete-icon.png');
    this.load.audio('clickSound', 'assets/click.mp3');
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
    // Add buttons side by side
    const createBtn = this.add.image(this.width / 2 - 110, 240, 'createButton')
      .setOrigin(0.5)
      .setScale(0.7)
      .setInteractive()
      .setDepth(DEPTHS.UI_ELEMENTS)
      .on('pointerdown', () => {
        this.clickSound.play();
        this.handleCreateRoom();
      });
    
    const joinBtn = this.add.image(this.width / 2 + 110, 240, 'joinButton')
      .setOrigin(0.5)
      .setInteractive()
      .setDepth(DEPTHS.UI_ELEMENTS)
      .on('pointerdown', () => {
        this.clickSound.play();
        this.handleJoinRoom();
      });
    
    // Add hover effects
    addHoverEffect(this, createBtn);
    addHoverEffect(this, joinBtn);
  }

  handleCreateRoom() {
    try {
      const roomName = prompt('Enter room name:');
      if (roomName) {
        const gameMode = confirm('Click OK for Single Player (vs Bot), Cancel for Multiplayer') ? 'singleplayer' : 'multiplayer';
        const maxPlayers = gameMode === 'singleplayer' ? 1 : 2;
        window.socket.emit('createRoom', { name: roomName, settings: { maxPlayers, gameMode } });
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }

  handleJoinRoom() {
    const roomId = prompt('Enter room ID:');
    if (roomId) {
      window.socket.emit('joinRoom', roomId);
    }
  }

  displayUserID() {
    // Display user ID in the upper right corner
    if (window.playerId) {
      this.add.text(this.width - 20, 20, `ID: ${window.playerId.substring(0, 8)}...`, {
        fontSize: '16px',
        fill: COLORS.TEXT_WHITE,
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 }
      }).setOrigin(1, 0).setDepth(DEPTHS.UI_ELEMENTS);
    }
  }

  createRoomListPanel() {
    // Room list panel background - moved lower
    const panelY = 340; 
    const panelHeight = 300;
    
    // More transparent panel (0.6 instead of 0.7)
    const panelBg = this.add.rectangle(this.width / 2, panelY + panelHeight/2, 500, panelHeight, 0x000000, 0.6)
      .setOrigin(0.5)
      .setDepth(DEPTHS.UI_BG)
    
    // Room list title
    this.add.text(this.width / 2, panelY + 15, 'Available Rooms:', {
      fontSize: '24px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(DEPTHS.UI_ELEMENTS);
    
    // Container for room list - moved lower relative to the title
    this.roomListContainer = this.add.container(this.width / 2, panelY + 60);
    this.roomListContainer.setDepth(DEPTHS.UI_ELEMENTS);
    
    // No rooms text (initially visible)
    this.noRoomsText = this.add.text(0, 50, 'No rooms available. Create one!', {
      fontSize: '18px',
      fill: '#aaa',
    }).setOrigin(0.5);
    this.roomListContainer.add(this.noRoomsText);
  }

  setupEventListeners() {
    // Handle browser back button
    window.onpopstate = () => {
      window.socket.emit('getRoomList');
    };

    // Request room list from server
    window.socket.emit('getRoomList');
    
    // Update room list when received
    window.socket.on('roomList', (roomList) => {
      this.updateRoomList(roomList);
    });
    
    // Listen for room list updates
    window.socket.on('roomListUpdated', () => {
      window.socket.emit('getRoomList');
    });
    
    // Handle scene wake event (when returning from other scenes)
    this.events.on('wake', () => {
      // Refresh room list when returning to this scene
      window.socket.emit('getRoomList');
    });
    
    // Handle room creation
    window.socket.on('roomCreated', (data) => {
      window.socket.emit('joinRoom', data.roomId);
    });
    
    // Handle joining room
    window.socket.on('joinedRoom', (data) => {
      window.socket.playerPosition = data.position;
      console.log('Joined room as:', window.socket.playerPosition);
      this.scene.start('WaitingScene', { roomId: data.roomId });
      this.scene.stop('MenuScene');
    });

    // Set up auto-refresh for room list every 3 seconds
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
    
    // Clean up browser back button handler
    window.onpopstate = null;
    
    // Clean up wake event
    this.events.off('wake');
  }
}