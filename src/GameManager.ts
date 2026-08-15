import * as pc from 'playcanvas';
import {registerComponents} from './registerComponents.js';
import {Game} from './components/game.js';

export class GameManager {
    public app: pc.Application;
    private game: Game;
    constructor(canvas: HTMLCanvasElement) {
        this.app = new pc.Application(canvas, {
            mouse: new pc.Mouse(canvas),
            keyboard: new pc.Keyboard(window),
        });
        this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

        window.addEventListener('resize', () => this.app.resizeCanvas());

        registerComponents(this.app);

        const game = new pc.Entity();
        game.addComponent('script');
        this.game = game.script!.create('game') as unknown as Game;
        this.app.root.addChild(game);

        this.setUpButtons();
        this.app.start();
    }
    
    declare private htmlEnterVRButton: HTMLElement;
    declare private htmlPlayButton: HTMLElement;
    declare private htmlRestartButton: HTMLElement;

    private setUpButtons() {
        this.htmlEnterVRButton = document.getElementById('enter-vr')!;
        this.htmlPlayButton = document.getElementById('play')!;
        this.htmlRestartButton = document.getElementById('restart')!;

        if (window.navigator.xr)
            window.navigator.xr.isSessionSupported('immersive-vr').then((e) => {
                if (!e) {
                    this.htmlEnterVRButton.classList.add('none');
                    this.htmlPlayButton.classList.remove('none');
                } else this.htmlPlayButton.classList.add('none');
            });
        else this.htmlPlayButton.classList.add('none');

        document.addEventListener('pointerlockchange', async (e) => {
            if (!document.pointerLockElement) {
                // await this.game.gameStateChange('pause');
                // this.game.desktopPointer.enabled = false;
                this.htmlPlayButton.classList.remove('none');
                this.htmlRestartButton.classList.remove('none');
            }
        });

        if (this.app.xr?.supported) {
            const activate = () => {
                if (this.app.xr?.isAvailable(pc.XRTYPE_VR)) {
                    this.game.startXR();
                } else {
                    console.log('Immersive VR is not available');
                }
            };

            this.htmlEnterVRButton.addEventListener('click', () => {
                if (!this.app.xr?.active) {
                    activate();
                    this.htmlRestartButton.classList.add('none');
                }
            });
            this.htmlPlayButton.addEventListener('click', () => {
                this.app.mouse?.enablePointerLock(() => {
                    // this.app.mainCamera.script.lookCamera.enabled = true;
                    // //this.app.htmlEnterVRButton.classList.add('none');
                    // this.htmlPlayButton.classList.add('none');
                    // this.htmlRestartButton.classList.add('none');
                    // this.game.play();
                    // setTimeout(() => {
                    //     this.app.game.desktopPointer.enabled = true;
                    // }, 700);
                });
            });
            this.htmlRestartButton.addEventListener('click', () => {
                // this.app.mouse?.enablePointerLock(() => {
                //     this.app.mainCamera.script.lookCamera.enabled = true;
                //     //this.app.htmlEnterVRButton.classList.add('none');
                //     this.htmlPlayButton.classList.add('none');
                //     this.htmlRestartButton.classList.add('none');
                //     this.game.restart();
                //     setTimeout(() => {
                //         this.game.desktopPointer.enabled = true;
                //     }, 700);
                // });
            });
            // end session by keyboard ESC
            this.app.keyboard?.on('keydown', (evt) => {
                if (evt.key === pc.KEY_ESCAPE) {
                    if (this.app.xr?.active) {
                        this.game.endXR();
                        this.app.xr.end();
                        this.htmlEnterVRButton.style.display = 'block';
                    }
                }
            });

            this.app.xr.on('end', () => {
                this.htmlEnterVRButton.style.display = 'block';
            });
        }
    }

    startXR() {}

    endXR() {}
}
