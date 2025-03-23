class MusicManager {
  constructor() {
    this.music = null;
    this.isMuted = false;
    this.volume = 0.5;
    this.initialized = false;
    this.pendingAutoplay = false;
  }

  init() {
    if (this.initialized) return;
    
    // Create audio element
    this.music = new Audio();
    this.music.src = 'assets/background-music.mp3';
    this.music.loop = true;
    this.music.volume = this.volume;
    this.music.preload = 'auto'; // Preload the audio
    
    // Add event listeners for debugging
    this.music.addEventListener('play', () => {
      console.log('Music started playing');
      this.pendingAutoplay = false;
    });
    
    this.music.addEventListener('error', (e) => {
      console.error('Music error:', e);
      console.error('Error code:', this.music.error ? this.music.error.code : 'unknown');
    });
    
    // Load mute state from localStorage if available
    const savedMute = localStorage.getItem('musicMuted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
      this.music.muted = this.isMuted;
    }
    
    // Set up global interaction handler to start music
    this.setupGlobalInteractionHandler();
    
    this.initialized = true;
    console.log('MusicManager initialized');
  }

  setupGlobalInteractionHandler() {
    // Function to handle first user interaction
    const handleFirstInteraction = () => {
      if (this.pendingAutoplay) {
        console.log('User interaction detected, starting music');
        this.play();
      }
      
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    // Add event listeners for common user interactions
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
  }

  play() {
    if (!this.initialized) this.init();
    
    // Only play if not already playing
    if (this.music.paused) {
      console.log('Attempting to play music...');
      // Use a promise to handle autoplay restrictions
      const playPromise = this.music.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('Music playing successfully');
          this.pendingAutoplay = false;
        }).catch(error => {
          console.log('Autoplay prevented:', error);
          // Mark that we want to play as soon as possible
          this.pendingAutoplay = true;
        });
      }
    } else {
      console.log('Music is already playing');
    }
  }

  stop() {
    if (this.initialized && this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.pendingAutoplay = false;
    }
  }

  toggleMute() {
    if (!this.initialized) this.init();
    
    this.isMuted = !this.isMuted;
    this.music.muted = this.isMuted;
    
    // Save mute state to localStorage
    localStorage.setItem('musicMuted', this.isMuted);
    
    return this.isMuted;
  }

  setVolume(volume) {
    if (!this.initialized) this.init();
    
    this.volume = volume;
    this.music.volume = volume;
  }
  
  isPending() {
    return this.pendingAutoplay;
  }
}

// Create a global instance
window.musicManager = new MusicManager();