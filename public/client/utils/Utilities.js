export function initLayoutValues() {
  this.screenWidth = this.baseWidth;
  this.screenHeight = this.baseHeight;
  this.castleY = this.screenHeight * this.castleYFraction;
  this.castleXOffset = this.screenWidth * this.castleXOffsetFraction;
  this.castleSize = this.screenHeight * this.castleSizeFraction;
  this.hpBarWidth = this.screenWidth * this.hpBarWidthFraction;
  this.hpBarHeight = this.screenHeight * this.hpBarHeightFraction;
  this.hpBarYOffset = this.castleY - this.castleSize * 0.4;
  this.playerHPBarX = this.screenWidth / 2 - this.castleXOffset - this.hpBarWidth / 2;
  this.opponentHPBarX = this.screenWidth / 2 + this.castleXOffset - this.hpBarWidth / 2;
}