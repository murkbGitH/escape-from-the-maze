import ThingModel from 'models/things/ThingModel';


export default class PlayerThingModel extends ThingModel {

  constructor() {
    super();

    this._symbol = '@';
  }

  toContent() {
    return '{magenta-fg}' + this._symbol + '{/}';
  }
}

Object.assign(PlayerThingModel, {
  typeId: 'player'
});
