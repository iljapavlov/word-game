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

    this.createPixelParticleTextures();
  }

  create() {
    this.DEPTHS = {
      BACKGROUND: 0,
      PARTICLES: 1,
      UI_BG: 2,
      UI_ELEMENTS: 3
    };

    this.initializeVariables();
    this.setupBackgroundElements();
    this.createSakuraParticles();
    this.createUI();

    this.setupEventListeners();

    // --- DEBUGGING UI ---
    const logo = this.children.list.find(child => child.texture && child.texture.key === 'logo');
    if (logo) {
      console.log('Logo found:', logo.x, logo.y, logo.scaleX, logo.scaleY, logo.alpha, logo.visible, logo.depth);
    } else {
      console.log('Logo not found.');
    }

    const createButton = this.children.list.find(child => child.texture && child.texture.key === 'createButton');
    if (createButton) {
      console.log('Create Button found:', createButton.x, createButton.y, createButton.scaleX, createButton.scaleY, createButton.alpha, createButton.visible, createButton.depth);
    } else {
      console.log('Create Button not found.');
    }

    const joinButton = this.children.list.find(child => child.texture && child.texture.key === 'joinButton');
    if (joinButton) {
      console.log('Join Button found:', joinButton.x, joinButton.y, joinButton.scaleX, joinButton.scaleY, joinButton.alpha, joinButton.visible, joinButton.depth);
    } else {
      console.log('Join Button not found.');
    }

    const userIdText = this.children.list.find(child => child.text && child.text.startsWith('ID:'));
    if (userIdText) {
      console.log('User ID Text found:', userIdText.x, userIdText.y, userIdText.alpha, userIdText.visible, userIdText.depth, userIdText.style);
    } else {
      console.log('User ID Text not found.');
    }

    const roomListTitle = this.children.list.find(child => child.text && child.text === 'Available Rooms:');
    if (roomListTitle) {
      console.log('Room List Title found:', roomListTitle.x, roomListTitle.y, roomListTitle.alpha, roomListTitle.visible, roomListTitle.depth, roomListTitle.style);
    } else {
      console.log('Room List Title not found.');
    }
    // --- END DEBUGGING UI ---
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
    .setDepth(this.DEPTHS.BACKGROUND);
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
      .setDepth(this.DEPTHS.UI_ELEMENTS);
  }

  createButtons() {
    // Add buttons side by side
    const createBtn = this.add.image(this.width / 2 - 110, 240, 'createButton')
      .setOrigin(0.5)
      .setScale(0.7)
      .setInteractive()
      .setDepth(this.DEPTHS.UI_ELEMENTS)
      .on('pointerdown', () => {
        this.clickSound.play();
        this.handleCreateRoom();
      });
    
    const joinBtn = this.add.image(this.width / 2 + 110, 240, 'joinButton')
      .setOrigin(0.5)
      .setInteractive()
      .setDepth(this.DEPTHS.UI_ELEMENTS)
      .on('pointerdown', () => {
        this.clickSound.play();
        this.handleJoinRoom();
      });
    
    // Add hover effects
    this.addHoverEffect(createBtn);
    this.addHoverEffect(joinBtn);
  }

  handleCreateRoom() {
    const roomName = prompt('Enter room name:');
    if (roomName) {
      const gameMode = confirm('Click OK for Single Player (vs Bot), Cancel for Multiplayer') ? 'singleplayer' : 'multiplayer';
      const maxPlayers = gameMode === 'singleplayer' ? 1 : 2;
      window.socket.emit('createRoom', { name: roomName, settings: { maxPlayers, gameMode } });
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
    if (window.socket && window.socket.id) {
      this.add.text(this.width - 20, 20, `ID: ${window.socket.id.substring(0, 8)}...`, {
        fontSize: '16px',
        fill: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 }
      }).setOrigin(1, 0).setDepth(this.DEPTHS.UI_ELEMENTS);
    }
  }

  createRoomListPanel() {
    // Room list panel background - moved lower
    const panelY = 340; 
    const panelHeight = 300;
    
    // More transparent panel (0.6 instead of 0.7)
    const panelBg = this.add.rectangle(this.width / 2, panelY + panelHeight/2, 500, panelHeight, 0x000000, 0.6)
      .setOrigin(0.5)
      .setDepth(this.DEPTHS.UI_BG)
    
    // Room list title
    this.add.text(this.width / 2, panelY + 15, 'Available Rooms:', {
      fontSize: '24px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(this.DEPTHS.UI_ELEMENTS);
    
    // Container for room list - moved lower relative to the title
    this.roomListContainer = this.add.container(this.width / 2, panelY + 60);
    this.roomListContainer.setDepth(this.DEPTHS.UI_ELEMENTS);
    
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
      this.scene.start('WaitingScene', { roomId: data.roomId });
      this.scene.stop('MenuScene');
    });
  }

  createSakuraParticles() {
    // Create particle emitter using our generated textures
    this.sakuraEmitter = this.add.particles('pixelSakura2').createEmitter({
      x: { min: 0, max: this.width },
      y: 0,
      lifespan: 5000,
      speedY: { min: 40, max: 80 },
      scale: { start: 1.5, end: 1.5 },
      quantity: 2,
      blendMode: 'OVERLAY',
      frequency: 80,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, this.width, 1) }
    });

    // Log the emitter's texture
    console.log('Sakura Emitter Texture:', this.sakuraEmitter.texture);

    // Ensure particles don't block interaction
    this.input.setTopOnly(true);
  }
  
  createPixelParticleTextures() {
    // Base colors for the particles with slight variations
    const baseColors = [
      0xffb7c5,  // Light pink
      0xff9eb5,  // Medium pink
      0xffc0cb   // Pink
    ];
    
    // Create 3 different petal designs
    for (let i = 1; i <= 3; i++) {
      // Create a graphics object to draw our particle
      const graphics = this.make.graphics();
      
      // Choose base color for this particle
      const baseColor = baseColors[i-1];
      
      // Create different petal shapes based on index
      if (i === 1) {
        // Simple 5-pixel floral shape
        graphics.fillStyle(baseColor);
        graphics.fillRect(2, 0, 4, 2);  // top
        graphics.fillRect(0, 2, 2, 4);  // left
        graphics.fillRect(6, 2, 2, 4);  // right
        graphics.fillRect(2, 6, 4, 2);  // bottom
        
        // Center pixel with slight color variation
        graphics.fillStyle(baseColor + 0x111111);
        graphics.fillRect(2, 2, 4, 4);
      } 
      else if (i === 2) {
        // Diamond shape
        graphics.fillStyle(baseColor);
        graphics.fillRect(3, 0, 2, 2);  // top
        graphics.fillRect(0, 3, 2, 2);  // left
        graphics.fillRect(6, 3, 2, 2);  // right
        graphics.fillRect(3, 6, 2, 2);  // bottom
        
        // Corner fills
        graphics.fillStyle(baseColor - 0x111111);
        graphics.fillRect(2, 2, 2, 2);  // top-left
        graphics.fillRect(4, 2, 2, 2);  // top-right
        graphics.fillRect(2, 4, 2, 2);  // bottom-left
        graphics.fillRect(4, 4, 2, 2);  // bottom-right
      }
      else {
        // Small cross shape
        graphics.fillStyle(baseColor);
        graphics.fillRect(3, 1, 2, 6);  // vertical
        graphics.fillRect(1, 3, 6, 2);  // horizontal
        
        // Add highlight
        graphics.fillStyle(baseColor + 0x222222);
        graphics.fillRect(3, 3, 2, 2);  // center
      }
      
      // Generate texture from the graphics
      graphics.generateTexture('pixelSakura' + i, 8, 8);
      graphics.destroy();
    }
  }

  updateRoomList(roomList) {
    // Clear existing room list
    this.roomListContainer.removeAll(true);
    
    // Show or hide "no rooms" message
    if (roomList.length === 0) {
      this.noRoomsText = this.add.text(0, 50, 'No rooms available. Create one!', {
        fontSize: '18px',
        fill: '#aaa',
        fontStyle: 'italic'
      }).setOrigin(0.5);
      this.roomListContainer.add(this.noRoomsText);
      return;
    }
    
    // Add each room as a styled panel
    roomList.forEach((room, index) => {
      const yPos = index * 50;
      
      // Room panel background
      const panel = this.add.rectangle(0, yPos, 400, 40, 0x333333, 0.6) // More transparent
        .setOrigin(0.5, 0.5)
        .setInteractive()
        .on('pointerdown', () => {
          this.clickSound.play();
          window.socket.emit('joinRoom', room.id);
        });
      
      // Room name and status
      const roomText = this.add.text(-180, yPos, room.name, {
        fontSize: '18px',
        fill: '#fff'
      }).setOrigin(0, 0.5);
      
      // Player count
      const playerText = this.add.text(100, yPos, `${room.players}/${room.maxPlayers}`, {
        fontSize: '18px',
        fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
      }).setOrigin(0.5);
      
      // Status text
      const statusText = this.add.text(170, yPos, room.status, {
        fontSize: '16px',
        fill: room.status === 'Open' ? '#7CFC00' : '#FF6347'
      }).setOrigin(0, 0.5);
      
      // Add delete button
      const deleteBtn = this.add.image(180, yPos, 'deleteIcon')
        .setOrigin(0.5)
        .setScale(0.5)
        .setInteractive()
        .setAlpha(0.7)
        .on('pointerdown', (event) => {
          event.stopPropagation(); // Prevent joining the room when clicking delete
          this.clickSound.play();
          window.socket.emit('deleteRoom', room.id);
        });
      
      // Add hover effect to panel and delete button
      this.addHoverEffect(panel);
      this.addHoverEffect(deleteBtn, 0.5, 0.6);
      
      // Add all elements to container
      this.roomListContainer.add([panel, roomText, playerText, statusText, deleteBtn]);
    });
  }
  
  addHoverEffect(gameObject, baseScale = null, hoverScale = null) {
    // Store the initial scale when adding the effect
    const initialScale = baseScale || gameObject.scale;
    const targetScale = hoverScale || (initialScale * 1.1);
    
    gameObject.on('pointerover', () => {
      this.tweens.add({
        targets: gameObject,
        scale: targetScale,
        duration: 100
      });
    });
    
    gameObject.on('pointerout', () => {
      this.tweens.add({
        targets: gameObject,
        scale: initialScale,
        duration: 100
      });
    });
  }

  shutdown() {
    if (this.sakuraEmitter) {
      this.sakuraEmitter.stop();
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