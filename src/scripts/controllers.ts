import * as pc from 'playcanvas';

export class Controllers extends pc.Script {
    static override scriptName = 'controllers';
    initialize() {
        const input = this.app.xr?.input;
        if (!input) return;
        input.on('select', this.onSelect, this);
        this.once('destroy', () => input.off('select', this.onSelect, this));
    }

    private onSelect(inputSource: pc.XrInputSource) {
        if (this.enabled && this.entity.enabled) this.app.root.fire('xr:onTrigger', inputSource);
    }
}
