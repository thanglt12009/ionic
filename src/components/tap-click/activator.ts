import { App } from '../app/app';
import { Config } from '../../config/config';
import { PointerCoordinates, nativeTimeout, rafFrames } from '../../util/dom';


export class Activator {
  protected _css: string;
  protected _queue: HTMLElement[] = [];
  protected _active: HTMLElement[] = [];
  protected _activeRafDefer: Function;

  constructor(protected app: App, config: Config) {
    this._css = config.get('activatedClass') || 'activated';
  }

  _clearDeferred() {
    // Clear any active deferral
    if (this._activeRafDefer) {
      this._activeRafDefer();
      this._activeRafDefer = null;
    }
  }

  downAction(ev: UIEvent, activatableEle: HTMLElement, startCoord: PointerCoordinates) {
    // the user just pressed down
    if (this.disableActivated(ev)) {
      return;
    }

    // queue to have this element activated
    this._queue.push(activatableEle);

    this._activeRafDefer = rafFrames(6, () => {
      let activatableEle: HTMLElement;
      for (let i = 0; i < this._queue.length; i++) {
        activatableEle = this._queue[i];
        if (activatableEle && activatableEle.parentNode) {
          this._active.push(activatableEle);
          activatableEle.classList.add(this._css);
        }
      }
      this._queue.length = 0;
      this._clearDeferred();
    });
  }

  // the user was pressing down, then just let up
  upAction(ev: UIEvent, activatableEle: HTMLElement, startCoord: PointerCoordinates) {

    this._clearDeferred();

    rafFrames(CLEAR_STATE_DEFERS, () => {
      this.clearState();
    });
  }

  // all states should return to normal
  clearState() {

    if (!this.app.isEnabled()) {
      // the app is actively disabled, so don't bother deactivating anything.
      // this makes it easier on the GPU so it doesn't have to redraw any
      // buttons during a transition. This will retry in XX milliseconds.
      nativeTimeout(() => {
        this.clearState();
      }, 600);

    } else {
      // not actively transitioning, good to deactivate any elements
      this.deactivate();
    }
  }

  // remove the active class from all active elements
  deactivate() {

    this._clearDeferred();

    // Our list of elements that need to be activated yet but activator hasn't
    // had the chance to activate yet
    let toActivate = [];

    this._queue.length = 0;

    this._activeRafDefer = rafFrames(2, () => {
      for (var i = 0; i < this._active.length; i++) {
        if (this._active[i].classList.contains(this._css)) {
          this._active[i].classList.remove(this._css);
        } else {
          toActivate.push(this._active[i]);
        }
      }

      this._active = toActivate;

      this._activeRafDefer = rafFrames(6, () => {
        let activatableEle: HTMLElement;
        for (let i = 0; i < this._queue.length; i++) {
          activatableEle = this._queue[i];
          if (activatableEle && activatableEle.parentNode) {
            this._active.push(activatableEle);
            activatableEle.classList.add(this._css);
          }
        }
        this._queue.length = 0;
        this._clearDeferred();
      });
    });
  }

  disableActivated(ev: any) {
    if (ev.defaultPrevented) {
      return true;
    }

    let targetEle = ev.target;
    for (let i = 0; i < 4; i++) {
      if (!targetEle) {
        break;
      }
      if (targetEle.hasAttribute('disable-activated')) {
        return true;
      }
      targetEle = targetEle.parentElement;
    }
    return false;
  }

}

const CLEAR_STATE_DEFERS = 5;
