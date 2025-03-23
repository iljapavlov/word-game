export class GameState {
  constructor() {
      this.submittedWords = new Set();
      this.multiplier = 1.0;
      this.isPaused = false;
      this.gameEnded = false;
      this.playerInput = '';
      this.givenWord = '';
      this.lastWordTime = 0;
      this.playerHP = 100;
      this.opponentHP = 100;
  }

  reset(givenWord) {
      this.submittedWords.clear();
      this.multiplier = 1.0;
      this.isPaused = false;
      this.gameEnded = false;
      this.playerInput = '';
      this.givenWord = givenWord;
      this.lastWordTime = Date.now();
      this.playerHP = 100;
      this.opponentHP = 100;
  }

  decayMultiplier() {
      if (!this.gameEnded && !this.isPaused && this.multiplier > 1.0) {
          this.multiplier = Math.max(1.0, this.multiplier * 0.999);
      }
  }
}