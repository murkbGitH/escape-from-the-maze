import flux from 'flux';
import _ from 'lodash';

import SingletonMixin from 'lib/mixins/singleton';


export default class Dispatcher extends flux.Dispatcher {

  handleViewAction(action) {
    this.dispatch({
      source: 'view_action',
      action
    });
  }
}

_.assign(Dispatcher, SingletonMixin);
