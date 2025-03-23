import { StandardGameScene } from './scenes/gameModes/StandardGameScene.js';

export const GameModeFactory = {
    getGameScene(mode) {
        switch (mode) {
            case 'standard':
                return StandardGameScene;
            default:
                return StandardGameScene;
        }
    }
};