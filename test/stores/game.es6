import assert from 'power-assert';
import sinon from 'sinon';

import App from 'app';
import {Stage} from 'lib/stages';
import BonusTime5Thing from 'lib/things/bonus-time-5';
import PenaltyTime3Thing from 'lib/things/penalty-time-3';
import MazeModel from 'models/MazeModel';
import GameStore from 'stores/game';


describe('stores/game', function() {

  function _createGameStore() {
    var store = new GameStore();
    store._stageTypeId = 'simple';
    return store;
  }

  beforeEach(function() {
    App.purgeInstances();
  });

  it('should be defined', function() {
    assert.strictEqual(typeof GameStore, 'function');
  });

  it('hasNextMaze', function() {
    class FooStage extends Stage {}
    FooStage.mazeCount = 5;

    var store = _createGameStore();
    store._prepare();
    store._runningMazeCount = 4;
    sinon.stub(store, '_getStage', () => FooStage);

    assert.strictEqual(store.hasNextMaze(), true);
    store._runningMazeCount = 5;
    assert.strictEqual(store.hasNextMaze(), false);
  });

  it('_doesPlayerArriveGoal', function() {
    var store = _createGameStore();
    store._prepare();
    assert.strictEqual(store._doesPlayerArriveGoal(), false);
    store.maze.moveThing(
      store._things.player,
      [1, 1],
      store.maze.searchThingPos(store._things.upstairs)
    );
    assert.strictEqual(store._doesPlayerArriveGoal(), true);
  });

  it('_crushWallByPlayer', function() {
    var store = _createGameStore();
    store._prepare();
    store._picksCount = 1;
    let playerPos = store._maze.searchThingPos(store._things.player);
    let upperPos = [playerPos[0] - 1, playerPos[1]];
    let wallAtUpper = store._maze.getCellOrError(upperPos).getThing();
    assert.strictEqual(wallAtUpper.getTypeId(), 'wall');
    store._crushWallByPlayer(MazeModel.DIRECTIONS.UP);
    let crushedThing = store._maze.getCellOrError(upperPos).getThing();
    assert.strictEqual(crushedThing, null);
    assert.strictEqual(store._picksCount, 0);
  });

  it('_pickThingsByPlayer', function() {
    var store = _createGameStore();
    store._prepare();
    let playerPos = store._maze.searchThingPos(store._things.player);
    function getThingCount() {
      return store._maze.getCellOrError(playerPos).getThings().length;
    }
    assert.strictEqual(getThingCount(), 1);
    let bonusTime5Thing = new BonusTime5Thing();
    let penaltyTime3Thing = new PenaltyTime3Thing();

    store._maze.addThing(bonusTime5Thing, playerPos);
    store._maze.addThing(penaltyTime3Thing, playerPos);

    assert.strictEqual(getThingCount(), 3);
    let baseTimeLimit = store._timeLimit;
    store._pickThingsByPlayer();
    assert.strictEqual(getThingCount(), 1);
    assert(store._timeLimit > baseTimeLimit);
  });
});
