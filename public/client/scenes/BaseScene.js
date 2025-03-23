import { initLayoutValues } from '../utils/Utilities.js';

export class BaseScene extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.baseWidth = 800;
        this.baseHeight = 800;
        this.castleYFraction = 0.8;
        this.castleXOffsetFraction = 0.4;
        this.castleSizeFraction = 0.25;
        this.hpBarWidthFraction = 0.15;
        this.hpBarHeightFraction = 0.015;
    }

    preload() {
        this.load.image('background', 'assets/bg2.jpg');
        this.load.image('castle_100', 'assets/castle_100.png');
        this.load.image('homeButton', 'assets/home-button.png');
        this.load.image('wordBackground', 'assets/word-bg.png');        
        this.load.image('fireball', 'assets/fireball.png');

        this.load.audio('fireballSound', 'assets/fireball.mp3');
        this.load.audio('hitSound', 'assets/hit.mp3');
        this.load.audio('keySound', 'assets/key.mp3');
    }

    createBackground() {
        this.background = this.add.image(0, 0, 'background')
            .setOrigin(0)
            .setDisplaySize(this.screenWidth, this.screenHeight)
            .setDepth(0);
    }

    createHomeButton() {
        this.homeButton = this.add.image(40, 40, 'homeButton')
            .setOrigin(0.5)
            .setScale(0.2)
            .setInteractive()
            .on('pointerdown', () => this.returnToLobby());
    }

    initLayout() {
        initLayoutValues.call(this);
    }

    returnToLobby() {
        this.scene.start('MenuScene');
        this.scene.stop(this.scene.key);
    }
}