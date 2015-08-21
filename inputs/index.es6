import chalk from 'chalk';
import _ from 'lodash';
import Rx from 'rx';

import GameActionCreators from 'actions/game-action-creators';
import ScreenActionCreators from 'actions/screen-action-creators';
import Maze from 'lib/maze';
import SingletonMixin from 'lib/mixins/singleton';
import ScreenManager from 'lib/screen-manager';
import {calculateMillisecondsPerFrame} from 'lib/util';
import GameStore from 'stores/game';
import ScreenStore from 'stores/screen';


function onTimerSourceData({ value, interval }) {
  let {screen} = ScreenManager.getInstance();
  let gameStore = GameStore.getInstance();
  if (value % 100 === 0) {
    screen.debug('frames:', value);
  }
  if (gameStore.isStarted() && !gameStore.hadPlayerBeenArriveGoal()) {
    GameActionCreators.forwardGameTimeByFrame();
  }
}

function onKeypressSourceData({ name, ctrl }) {
  let {screen} = ScreenManager.getInstance();
  let screenStore = ScreenStore.getInstance();
  let gameStore = GameStore.getInstance();

  screen.debug(name, ctrl);

  switch (screenStore.pageId) {
    case 'welcome':
      if (name === 'space') {
        ScreenActionCreators.prepareGame();
        ScreenActionCreators.changePage('game');
        return;
      }
      break;
    case 'game':
      if (gameStore.isStarted()) {
        let direction = {
          up: Maze.DIRECTIONS.UP,
          w: Maze.DIRECTIONS.UP,
          k: Maze.DIRECTIONS.UP,
          right: Maze.DIRECTIONS.RIGHT,
          d: Maze.DIRECTIONS.RIGHT,
          l: Maze.DIRECTIONS.RIGHT,
          down: Maze.DIRECTIONS.DOWN,
          s: Maze.DIRECTIONS.DOWN,
          j: Maze.DIRECTIONS.DOWN,
          left: Maze.DIRECTIONS.LEFT,
          a: Maze.DIRECTIONS.LEFT,
          h: Maze.DIRECTIONS.LEFT
        }[name];
        if (direction) {
          GameActionCreators.walkPlayer(direction);
          return;
        }
      }
      break;
    default:
      throw new Error(screenStore.pageId + ' is invalid pageId');
  }

  if (name === 'escape' || ctrl && name === 'c') {
    process.stdin.pause();
    process.exit(0);
    return;
  }
}

function onSubscribeError(err) {
  var msg = chalk.red('Error: ' + err);
  console.error(msg);
  screen.debug(msg);
}


export default class Inputs {

  constructor() {
    let {screen} = ScreenManager.getInstance();

    let pauser = new Rx.Subject();

    let timerSource = Rx.Observable
      .timer(0, calculateMillisecondsPerFrame())
      .timeInterval()
      .map((data) => {
        pauser.onNext(true);
        return data;
      })
    ;

    let wrappedHandler;
    let keypressSource = Rx.Observable
      .fromEventPattern(
        (handler) => {
          wrappedHandler = function(chr, key) {
            handler(key);
          };
          screen.addListener('keypress', wrappedHandler);
        },
        () => {
          screen.removeListener('keypress', wrappedHandler);
        }
      )
      .pausable(pauser)
      .filter(function() {
        var isStopped = pauser.isStopped;
        pauser.onNext(false);
        return !isStopped;
      })
    ;

    this._timerSubscription = timerSource.subscribe(
      onTimerSourceData,
      onSubscribeError
    );
    this._keypressSubscription = keypressSource.subscribe(
      onKeypressSourceData,
      onSubscribeError
    );
  }

  _destructor() {
    this._timerSubscription.dispose();
    this._keypressSubscription.dispose();
  }
}

_.assign(Inputs, SingletonMixin);

Inputs._destructInstance = function _destructInstance() {
  if (this._instance) {
    this._instance._destructor();
  }
};
