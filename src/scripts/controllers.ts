import * as pc from 'playcanvas';

export class Controllers extends pc.Script {
    static override scriptName = 'controllers';
    initialize() {
        if (!this.app.xr) {
            // If WebXR is not available, exit initialization
            return;
        }
        this.app.xr.input.on('add', inputSource => {
            inputSource.once('remove', () => {
                // know when input source has been removed
            });
        });

        this.app.xr.input.on('select', inputSource => {
            // Player pulls the trigger on the VR controllers.
            this.app.root.fire('xr:onTrigger', inputSource);
        });
    }

    update(dt: number) {}
}
