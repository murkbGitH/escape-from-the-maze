import _ from 'lodash';

import {ACTIONS, EVENTS} from 'consts';
import AppDispatcher from 'dispatcher/AppDispatcher';
import EventManager from 'lib/EventManager';
import {stages} from 'lib/stages';
import {requestAddingGameResult} from 'lib/apis';
import {calculateMillisecondsPerFrame} from 'lib/util';
import GameResultModel from 'models/GameResultModel';
import MazeModel from 'models/MazeModel';
import BonusTime5ThingModel from 'models/things/BonusTime5ThingModel';
import PenaltyTime3ThingModel from 'models/things/PenaltyTime3ThingModel';
import PicksThingModel from 'models/things/PicksThingModel';
import PlayerThingModel from 'models/things/PlayerThingModel';
import UpstairsThingModel from 'models/things/UpstairsThingModel';
import Store from 'stores/Store';


function createDefaultThings() {
  return {
    player: null,
    upstairs: null
  };
}


export default class GameStore extends Store {

  constructor(...args) {
    super(...args);

    Object.assign(this, {
      _stageTypeId: undefined,
      _gameTime: undefined,
      _timeLimit: undefined,
      _runningMazeCount: undefined,
      _picksCount: undefined,
      _isAssumedPicksMode: undefined,
      _maze: undefined,
      _hasBeenVictory: undefined,
      _hasBeenDefeat: undefined,
      _things: undefined,
      _gameResult: undefined
    });
    this._reset();

    Object.defineProperty(this, 'maze', { get() { return this._maze; } });
    Object.defineProperty(this, 'timeLimit', { get() { return this._timeLimit; } });
    Object.defineProperty(this, 'gameTime', { get() { return this._gameTime; } });
    Object.defineProperty(this, 'runningMazeCount', { get() { return this._runningMazeCount; } });
    Object.defineProperty(this, 'picksCount', { get() { return this._picksCount; } });
    Object.defineProperty(this, 'isAssumedPicksMode', { get() { return this._isAssumedPicksMode; } });
    Object.defineProperty(this, 'hasBeenVictory', { get() { return this._hasBeenVictory; } });
    Object.defineProperty(this, 'hasBeenDefeat', { get() { return this._hasBeenDefeat; } });
    Object.defineProperty(this, 'gameResult', { get() { return this._gameResult; } });

    let dispatcher = AppDispatcher.getInstance();
    let {emitter} = EventManager.getInstance();
    let dispatchToken0 = dispatcher.register((action) => {
      switch (action.type) {
        case ACTIONS.ADVANCE_TO_NEXT_MAZE:
          this._resetMaze();
          this._prepareMaze();
          this._runningMazeCount += 1;
          emitter.emit(EVENTS.UPDATE_MAZE);
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
        case ACTIONS.PREPARE_GAME:
          this._stageTypeId = action.stageTypeId;
          this._prepare();
          emitter.emit(EVENTS.UPDATE_MAZE);
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
      }
    });
    this._dispatchToken = dispatcher.register((action) => {
      dispatcher.waitFor([
        dispatchToken0
      ]);
      switch (action.type) {
        case ACTIONS.ASSUME_PICKS_MODE:
          this._isAssumedPicksMode = true;
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
        case ACTIONS.CANCEL_PICKS_MODE:
          this._isAssumedPicksMode = false;
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
        case ACTIONS.CRUSH_WALL_BY_PLAYER:
          this._isAssumedPicksMode = false;
          this._crushWallByPlayer(action.direction);
          emitter.emit(EVENTS.UPDATE_MAZE);
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
        case ACTIONS.FORWARD_GAME_TIME_BY_FRAME:
          if (this._forwardGameTime(calculateMillisecondsPerFrame())) {
            emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          }
          break;
        case ACTIONS.RESET_GAME:
          this._reset();
          emitter.emit(EVENTS.UPDATE_MAZE);
          break;
        case ACTIONS.REQUEST_ADDING_GAME_RESULT:
          // FIXME: Could not receive callback now
          requestAddingGameResult({
            stageTypeId: this._getStage().typeId,
            playerName: action.playerName,
            score: this.gameResult.calculateScore(),
          });
          break;
        case ACTIONS.SAVE_DEFEAT:
          this._hasBeenDefeat = true;
          emitter.emit(EVENTS.UPDATE_MAZE);
          break;
        case ACTIONS.SAVE_VICTORY:
          this._hasBeenVictory = true;
          this._gameResult = new GameResultModel({
            timeLimit: this._timeLimit,
            lastGameTime: this._gameTime
          });
          emitter.emit(EVENTS.UPDATE_MAZE);
          break;
        case ACTIONS.WALK_PLAYER:
          this._maze.walkThing(this._things.player, action.direction);
          this._pickThingsByPlayer();
          emitter.emit(EVENTS.UPDATE_MAZE);
          emitter.emit(EVENTS.UPDATE_GAME_STATUS);
          break;
      }
    });
  }

  _getStage() {
    return stages[this._stageTypeId] || null;
  }

  _reset() {
    this._stageTypeId = null;
    this._timeLimit = 1;
    this._gameTime = 0;  // int, ms
    this._runningMazeCount = 1;
    this._picksCount = 0;
    this._isAssumedPicksMode = false;
    this._hasBeenVictory = false;
    this._hasBeenDefeat = false;
    this._isDuringInputForScoring = false;
    this._gameResult = null;
    this._resetMaze();
  }

  _resetMaze() {
    this._maze = null;
    this._things = createDefaultThings();
  }

  _prepare() {
    let stage = this._getStage();
    this._timeLimit = stage.timeLimit;
    this._picksCount = stage.picksCount;
    this._prepareMaze();
  }

  _prepareMaze() {
    let stage = this._getStage();
    let maze = MazeModel.createByExtent([20, 10]);
    let player = new PlayerThingModel();
    let upstairs = new UpstairsThingModel();
    maze.addThing(player, [1, 1]);
    maze.addThing(upstairs, [
      maze.getHeight() - 2,
      maze.getWidth() - 2
    ]);

    _.range(stage.bonusTimeThingCount).forEach(() => {
      let pos = _.sample(maze.getBlankPosList());
      maze.addThing(new BonusTime5ThingModel(), pos);
    });
    _.range(stage.penaltyTimeThingCount).forEach(() => {
      let pos = _.sample(maze.getBlankPosList());
      maze.addThing(new PenaltyTime3ThingModel(), pos);
    });
    _.range(stage.picksThingCount).forEach(() => {
      let pos = _.sample(maze.getBlankPosList());
      maze.addThing(new PicksThingModel(), pos);
    });

    this._maze = maze;
    this._things = {
      player,
      upstairs
    };
  }

  /*
   * @return {boolean}  A second advanced or is not so
   */
  _forwardGameTime(ms) {
    let beforeGameTime = this._gameTime;
    this._gameTime += ms;
    return ~~(beforeGameTime / 1000) !== ~~(this._gameTime / 1000);
  }

  /*
   * @param {string} direction  Maze.DIRECTIONS
   */
  _crushWallByPlayer(direction) {
    if (this._picksCount < 1) {
      return;
    }
    let playerPos = this._maze.searchThingPos(this._things.player);
    let targetPos = MazeModel.composeCoordinates(
      playerPos,
      MazeModel.getRelativePosByDirection(direction)
    );
    let targetThing = this._maze.getCellOrError(targetPos).getThing();
    if (!targetThing || targetThing.getTypeId() !== 'wall') {
      return;
    }
    this._maze.removeThing(targetThing, targetPos);
    this._picksCount -= 1;
  }

  _pickThingsByPlayer() {
    let playerPos = this._maze.searchThingPos(this._things.player);
    if (!playerPos) {
      return;
    }
    let things = this._maze.getCellOrError(playerPos).getThings();
    let pickableThings = things.filter(thing => {
      return thing !== this._things.player && thing.isPickable();
    });
    pickableThings.forEach(thing => {
      switch (thing.getTypeId()) {
        case 'bonus_time_5':
          this._timeLimit += 5000;
          break;
        case 'penalty_time_3':
          this._timeLimit -= 3000;
          break;
        case 'picks':
          this._picksCount += 1;
          break;
      }
      this._maze.removeThing(thing, playerPos);
    });
  }

  getMazeCount() {
    let stage = this._getStage();
    if (!stage) {
      return 0;
    }
    return stage.mazeCount;
  }

  hasNextMaze() {
    return this._runningMazeCount < this.getMazeCount();
  }

  //
  // Game Lifecycle
  //
  //                1 2 3 4 5
  // -------------------------
  // isStarted      F T T T F
  // didPlayerGet~  F F T F F
  // hasBeen~       F F F T F
  // -------------------------
  //
  // (1) = Did not prepare/start game
  // (2) = Playing the game
  // (3) = Player got a victory/defeat, but flow does not pass in fps-event
  // (4) = Saved a result to _hasBeenVictory/_hasBeenDefeat
  // (5) = Destroyed the game instance
  //
  // Notice:
  // - (3) can handle more than once in the fps-event,
  //     however, it can not be expected at all otherwise!
  //   In other words, it can not be used in the view.
  //

  isStarted() {
    return !!this._maze;
  }

  _doesPlayerArriveGoal() {
    return this.isStarted() && this._maze.areThingsStayingTogether([this._things.player, this._things.upstairs]);
  }

  didPlayerGetVictoryJustNow() {
    return !this._hasBeenVictory && this._doesPlayerArriveGoal();
  }

  _isTimeLimitExceeded() {
    return this.isStarted() && this._gameTime > this._timeLimit;
  }

  didPlayerGetDefeatJustNow() {
    return !this._hasBeenDefeat && this._isTimeLimitExceeded();
  }

  isDecided() {
    return this._hasBeenVictory || this._hasBeenDefeat;
  }

  isPlaying() {
    return this.isStarted() && !this.isDecided();
  }
}
