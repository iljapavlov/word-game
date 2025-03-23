import { BaseScene } from '../BaseScene.js';
import { GameState } from '../../game/GameState.js';
import { CastleUI } from '../../ui/CastleUI.js';
import { HPBar } from '../../ui/HPBar.js';
import { WordDisplay } from '../../ui/WordDisplay.js';
import { setupSocketListeners, handleKeyDown } from '../../utils/EventHandlers.js';

export class StandardGameScene extends BaseScene {
    constructor() {
        super({ key: 'StandardGameScene' });
        console.log('StandardGameScene constructor called');
    }

    preload() {
      console.log('StandardGameScene preload started');
      super.preload();
      console.log('StandardGameScene preload completed');
    }

    create() {
        this.physics.world.setBounds(0, 0, this.baseWidth, this.baseHeight);
        this.initLayout();
        this.createBackground();
        this.createHomeButton();

        // game state initialization
        this.gameState = new GameState();
        console.log('GameState initialized');

        // ui initialization
        this.playerCastle = new CastleUI(this, this.screenWidth / 2 - this.castleXOffset, this.castleY, 'You', this.castleSize);
        this.opponentCastle = new CastleUI(this, this.screenWidth / 2 + this.castleXOffset, this.castleY, 'Enemy', this.castleSize);
        this.playerHPBar = new HPBar(this, this.playerHPBarX, this.hpBarYOffset, this.hpBarWidth, this.hpBarHeight, this.gameState.playerHP);
        this.opponentHPBar = new HPBar(this, this.opponentHPBarX, this.hpBarYOffset, this.hpBarWidth, this.hpBarHeight, this.gameState.opponentHP);
        this.wordDisplay = new WordDisplay(this, this.screenWidth, this.screenHeight);

        // Initialize particle manager (now handles smoke emitters)
        this.particleManager = new ParticleManager(this);
        
        this.fireballSound = this.sound.add('fireballSound', { volume: 0.5 });
        this.hitSound = this.sound.add('hitSound', { volume: 0.5 });
        this.keySound = this.sound.add('keySound', { volume: 0.5 });
        window.keySound = this.keySound;

        // event listeners
        // Add update method to update UI elements
        this.time.addEvent({ 
            delay: 100, 
            callback: () => {
                this.gameState.decayMultiplier();
                this.wordDisplay.updateMultiplier(this.gameState.multiplier);
            }, 
            callbackScope: this, 
            loop: true 
        });
        
        // Update smoke intensity based on HP
        this.time.addEvent({ 
            delay: 500, 
            callback: () => {
                this.particleManager.updateSmokeIntensity(
                    this.gameState.playerHP,
                    this.gameState.opponentHP,
                    this.gameState.gameEnded
                );
            }, 
            callbackScope: this, 
            loop: true 
        });
        
        setupSocketListeners(this, this.gameState, { wordDisplay: this.wordDisplay, playerHPBar: this.playerHPBar, opponentHPBar: this.opponentHPBar });
        this.input.keyboard.on('keydown', (event) => handleKeyDown(event, this.gameState, this.wordDisplay));
        window.socket.emit('requestGameState');

        // Add createFireball method
        this.createFireball = this.createFireballMethod.bind(this);
        
        // Set the given word if available
        if (window.givenWord) {
            this.gameState.givenWord = window.givenWord;
            this.wordDisplay.wordText.setText(window.givenWord.toUpperCase());
        }
    }

    createFireballMethod({ damage, startX, startY, targetX, targetY, isPlayerFireball }) {
      console.log(`Creating fireball with damage: ${damage}`);
      
      // Create a red circle for the fireball since we don't have an image
      const fireballRadius = 15;
      const fireball = this.add.graphics();
      fireball.fillStyle(0xff0000, 1); // Red color
      fireball.fillCircle(0, 0, fireballRadius);
      fireball.generateTexture('fireballTemp', fireballRadius * 2, fireballRadius * 2);
      fireball.clear();
      
      // Create the actual sprite using the generated texture
      const fireballSprite = this.add.sprite(startX, startY, 'fireballTemp')
          .setDepth(5);
      
      // Create particle emitter for the trail
      const particles = this.add.particles('fireballTemp');
      const emitter = particles.createEmitter({
          speed: 10,
          scale: { start: 0.4, end: 0 },
          blendMode: 'ADD',
          tint: [0xff0000, 0xff3300, 0xff6600], // Fire colors
          alpha: { start: 0.6, end: 0 },
          lifespan: 800,
          frequency: 15,
          follow: fireballSprite
      });
      
      // Play fireball sound
      this.fireballSound.play();
      
      // Use Phaser's built-in projectile and arcade physics
      this.physics.world.enable(fireballSprite);
      
      // Calculate a higher arc and slower speed
      const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
      
      // Slower speed factor
      const speedFactor = 0.35; 
      
      // Lower arc height for more direct hit
      const arcHeight = distance * 0.4; 
      
      // Adjust target position to aim more precisely at the castle center
      // Adjust more for player fireballs to prevent overshooting
      const adjustedTargetX = isPlayerFireball ? 
          targetX - this.castleSize * 0.4 : // More adjustment for player fireballs
          targetX + this.castleSize * 0.3;  // Less adjustment for opponent fireballs
      
      // Calculate angle between start and adjusted target
      const angle = Phaser.Math.Angle.Between(startX, startY, adjustedTargetX, targetY);
      
      // Calculate horizontal speed component
      const speed = distance * speedFactor;
      
      // Set velocity directly to ensure accurate targeting
      fireballSprite.body.velocity.x = Math.cos(angle) * speed;
      fireballSprite.body.velocity.y = Math.sin(angle) * speed - arcHeight;
      
      // Apply less gravity for a flatter trajectory
      fireballSprite.body.setGravityY(180);
      
      // Add rotation to the fireball
      this.tweens.add({
          targets: fireballSprite,
          angle: isPlayerFireball ? 360 : -360,
          duration: 2000,
          repeat: -1
      });
      
      // Create a larger target zone for more reliable hit detection
      const targetZone = {
          x: targetX,
          y: targetY,
          width: this.castleSize * 0.3,
          height: this.castleSize * 0.3
      };
      
      // Check if the fireball has reached its target
      const checkEvent = this.time.addEvent({
          delay: 16, // ~60fps
          callback: () => {
              // Check if fireball is within the target zone
              if (fireballSprite.x > targetZone.x - targetZone.width/2 && 
                  fireballSprite.x < targetZone.x + targetZone.width/2 &&
                  fireballSprite.y > targetZone.y - targetZone.height/2 && 
                  fireballSprite.y < targetZone.y + targetZone.height/2) {
                  
                  checkEvent.remove();
                  
                  // Play hit sound
                  this.hitSound.play();
                  
                  // Screen shake
                  this.shakeScreen(damage);
                  
                  // Remove fireball and particles
                  emitter.stop();
                  fireballSprite.destroy();
                  this.time.delayedCall(1000, () => particles.destroy());
                  
                  // Send damage to server if this is a player fireball
                  if (isPlayerFireball) {
                      window.socket.emit('fireballHit', {
                          damage: damage,
                          targetIsPlayer: false
                      });
                  }
              }
              
              // If the fireball goes off-screen, destroy it
              if (fireballSprite.y > this.cameras.main.height + 100 || 
                  fireballSprite.x < -100 || 
                  fireballSprite.x > this.cameras.main.width + 100) {
                  
                  checkEvent.remove();
                  emitter.stop();
                  fireballSprite.destroy();
                  this.time.delayedCall(1000, () => particles.destroy());
                  
                  // Apply damage even if the visual effect missed
                  if (isPlayerFireball) {
                      window.socket.emit('fireballHit', {
                          damage: damage,
                          targetIsPlayer: false
                      });
                  }
              }
          },
          callbackScope: this,
          loop: true
      });
      
      // Safety timeout
      this.time.delayedCall(5000, () => {
          if (fireballSprite.active) {
              checkEvent.remove();
              emitter.stop();
              fireballSprite.destroy();
              this.time.delayedCall(1000, () => particles.destroy());
              
              if (isPlayerFireball) {
                  window.socket.emit('fireballHit', {
                      damage: damage,
                      targetIsPlayer: false
                  });
              }
          }
      });
  }
  
  // Add a new method for screen shake
  shakeScreen(intensity) {
      // Scale the intensity based on damage (1-10 range)
      const shakeIntensity = Math.min(10, Math.max(3, intensity / 10));
      
      // Create a camera shake effect
      this.cameras.main.shake(300, shakeIntensity / 100);
  }
}