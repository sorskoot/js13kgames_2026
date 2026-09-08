import * as pc from 'playcanvas';
import {registerComponents} from './registerComponents.js';
import {Game} from './scripts/game.js';
export class GameManager {
    public app: pc.Application;
    private game: Game;
    constructor(canvas: HTMLCanvasElement) {
        this.app = new pc.Application(canvas);
        this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

        const resize = () => this.app.resizeCanvas();
        window.addEventListener('resize', resize);
        this.app.once('destroy', () => window.removeEventListener('resize', resize));

        registerComponents(this.app);

        const game = new pc.Entity();
        game.addComponent('script');
        this.game = game.script!.create('game') as unknown as Game;
        this.app.root.addChild(game);

        this.setUpButtons();
        this.app.start();
    }

    private setUpButtons() {
        const button = document.getElementById('enter-vr')!;
        const xr = this.app.xr;
        const activate = () => this.game.startXR();
        const update = () => button.classList.toggle('none', !xr?.isAvailable(pc.XRTYPE_VR) || xr.active);
        const ended = () => button.classList.toggle('none', !xr?.isAvailable(pc.XRTYPE_VR));
        button.addEventListener('click', activate);
        xr?.on('available:immersive-vr', update);
        xr?.on('start', update);
        xr?.on('end', ended);
        this.app.once('destroy', () => {
            button.removeEventListener('click', activate);
            xr?.off('available:immersive-vr', update);
            xr?.off('start', update);
            xr?.off('end', ended);
        });
        update();
    }
}
