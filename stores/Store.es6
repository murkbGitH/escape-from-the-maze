import SingletonMixin from 'lib/mixins/SingletonMixin';


export default class Store {

  constructor() {
    this._dispatchToken = null;
  }

  getDispatchToken() {
    if (!this._dispatchToken) {
      throw new Error('dispatchToken does not exist');
    }
    return this._dispatchToken;
  }
}

Object.assign(Store, SingletonMixin);
