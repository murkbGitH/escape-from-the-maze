import EVENTS from 'consts/events';
import Dispatcher from 'dispatcher';
import EventManager from 'lib/event-manager';
import Store from 'stores/store';


class ScreenStore extends Store {

  constructor() {
    super();

    this._pageId = 'welcome';

    Object.defineProperty(this, 'pageId', { get() { return this._pageId; } });

    let dispatcher = Dispatcher.getInstance();
    let {emitter} = EventManager.getInstance();
    let dispatchToken0 = dispatcher.register(({action}) => {
      switch (action.type) {
        case 'changePage':
          this._pageId = action.pageId;
          emitter.emit(EVENTS.RENDER);
          break;
      }
    });
    this.dispatchTokens.push(dispatchToken0);
  }
}


export default ScreenStore;
