function addHoverEffect(scene, gameObject, baseScale = null, hoverScale = null) {
    const initialScale = baseScale || gameObject.scale;
    const targetScale = hoverScale || (initialScale * 1.1);
  
    gameObject.on('pointerover', () => {
      scene.tweens.add({
        targets: gameObject,
        scale: targetScale,
        duration: 100
      });
    });
  
    gameObject.on('pointerout', () => {
      scene.tweens.add({
        targets: gameObject,
        scale: initialScale,
        duration: 100
      });
    });
  }