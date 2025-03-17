class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, 100, 'Word Battle', {
      fontSize: '64px',
      fill: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Room list title
    this.add.text(width / 2, height / 2 - 150, 'Available Rooms:', {
      fontSize: '24px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Container for room list
    this.roomListContainer = this.add.container(width / 2, height / 2 - 100);

    // Create Room button
    const createButton = this.add.rectangle(width / 2, height / 2 + 100, 200, 50, 0x00aa00).setOrigin(0.5);
    const createText = this.add.text(width / 2, height / 2 + 100, 'Create Room', {
      fontSize: '24px',
      fill: '#fff'
    }).setOrigin(0.5);
    createButton.setInteractive();
    createButton.on('pointerdown', () => {
      const roomName = prompt('Enter room name:');
      if (roomName) {
        const gameMode = confirm('Click OK for Single Player (vs Bot), Cancel for Multiplayer') ? 'singleplayer' : 'multiplayer';
        const maxPlayers = gameMode === 'singleplayer' ? 1 : 2;
        window.socket.emit('createRoom', { name: roomName, settings: { maxPlayers, gameMode } });
      }
    });

    // Join by ID button
    const joinButton = this.add.rectangle(width / 2, height / 2 + 170, 200, 50, 0x0000aa).setOrigin(0.5);
    const joinText = this.add.text(width / 2, height / 2 + 170, 'Join by ID', {
      fontSize: '24px',
      fill: '#fff'
    }).setOrigin(0.5);
    joinButton.setInteractive();
    joinButton.on('pointerdown', () => {
      const roomId = prompt('Enter room ID:');
      if (roomId) {
        window.socket.emit('joinRoom', roomId);
      }
    });

    // Request room list from server
    window.socket.emit('getRoomList');

    // Update room list when received
    window.socket.on('roomList', (roomList) => {
      // Clear existing room list
      this.roomListContainer.removeAll(true);

      // Add each room as clickable text
      roomList.forEach((room, index) => {
        const roomText = this.add.text(0, index * 30, `${room.name} (${room.players}/${room.maxPlayers}) - ${room.status}`, {
          fontSize: '20px',
          fill: '#fff'
        }).setOrigin(0.5);
        roomText.setInteractive();
        roomText.on('pointerdown', () => {
          window.socket.emit('joinRoom', room.id);
        });
        this.roomListContainer.add(roomText);
      });
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

  shutdown() {
    this.children.removeAll();
  }
}