document.querySelector('#start-ai').addEventListener('click', function() {


  var opts = document.querySelectorAll('select[name="ai-type"] option');
  console.log(opts);
  var aiType = 'random';
  Array.prototype.forEach.call(opts, function(opt) {
    console.log(opt.selected, opt.value);
    if (opt.selected) {
      aiType = opt.value;
    }
  });

  var stepTime = 0;
  var ai;
  if (aiType === 'greedy') {
    console.log('making greedy ai');
    ai = makeWorker(greedyAi);
  } else {
    console.log('making random ai');
    ai = makeWorker(randomAi);
  }

  ai.onerror = function(err) {
    console.error('Worker error:', err);
  };

  ai.onmessage = function(oEvent) {
    var name = oEvent.data.name;
    var args = oEvent.data.args;

    if (name === 'move') {
      manager.move.apply(manager, args);
      setTimeout(step, stepTime);
    } else {
      console.error('Unknown message ' + name + ' with args', args);
    }
  };

  function step() {
    // console.log('---');
    if (manager.over) {
      console.log('dead');
    } else {
      ai.postMessage({name: 'nextStep', args: [manager.grid.cells]});
    }
  };

  step();
});

function makeWorker(func) {
  var code = '(' + func.toString() + ')()';
  var blob = new Blob([code]);
  var url = URL.createObjectURL(blob);
  return new Worker(url);
}

function randomAi() {
  onmessage = function(oEvent) {
    var name = oEvent.data.name;
    var args = oEvent.data.args;
    var func = actions[name] || actions.unknown.bind(null, name);
    postMessage(func.apply(null, args));
  };

  var actions = {
    nextStep: function() {
      var dir = Math.floor(Math.random() * 4);
      return {
        name: 'move',
        args: [dir],
      };
    },

    unknown: function(name /* ...args */) {
      args = Array.prototype.slice.call(arguments, 1);
      console.error('Unknown message ' + name + ' with args', args);
    }
  };
}

function greedyAi() {
  onmessage = function(oEvent) {
    var name = oEvent.data.name;
    var args = oEvent.data.args;
    var func = actions[name] || actions.unknown.bind(null, name);
    postMessage(func.apply(null, args));
  }

  function printBoard(board) {
    var out = '\n';
    for (var y=0; y < board.length; y++){
      for (var x = 0; x < board[0].length; x++) {
        if (board[x][y]) {
          var v = board[x][y].value;
          if (v < 10) {
            out += '  ' + v;
          } else if (v < 100) {
            out += ' ' + v;
          } else {
            out += v;
          }
          out += ' ';
        } else {
          out += ' __ ';
        }
      }
      out += '\n';
    }
    console.log(out);
  }

  function possibleMerge(boardState, x, y) {
    if (boardState[x][y] === null) {
      return [null, 0];
    }
    // consolem.log('checking', x, y);
    var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (var i = 0; i < dirs.length; i++) {
      var dir = dirs[i];
      // console.log('dir', dir);
      var dx = dir[0], dy = dir[1];
      var xp = x + dx;
      var yp = y + dy;
      var cell = boardState[x][y];
      var cellp;

      while (xp >= 0 && xp < boardState.length &&
             yp >= 0 && yp < boardState[0].length) {
        cellp = boardState[xp][yp];
        if (boardState[xp][yp] === null) {
          // console.log('skipping', xp, yp);
          xp += dx;
          yp += dy;
        } else {
          // console.log('hit', xp, yp, cell.value, cellp.value);
          if (cell.value === cellp.value) {
            return [i, cell.value * 2];
          } else {
            break;
          }
        }
      }
      // console.log('edge');
    }
    return [null, 0];
  }

  var actions = {
    nextStep: function(boardState) {
      // printBoard(boardState);
      var scores = [0, 0, 0, 0];

      for (var x = 0; x < boardState.length; x++) {
        for (var y = 0; y < boardState[0].length; y++) {
          var merge = possibleMerge(boardState, x, y);
          var mergeDir = merge[0];
          var mergeScore = merge[1];
          if (mergeScore) {
            scores[mergeDir] += mergeScore;
          }
        }
      }

      var best = Math.max.apply(Math, scores);
      var dirNames = ['up', 'right', 'down', 'left'];
      var bestDir;
      var matches = 0;

      if (best === 0) {
        bestDir = Math.floor(Math.random() * 4);
        console.log('Random move: ' + dirNames[bestDir] + ' (' + bestDir + ')');
      } else {
        for (var i = 0; i < scores.length; i++) {
          if (scores[i] === best) {
            matches++;
            if (Math.random() < 1 / matches) {
              bestDir = i;
            }
          }
        }
        console.log('Best: ' + dirNames[bestDir] + ' (' + bestDir + ') ',
                    'score: ' + scores[bestDir]);
      }

      // console.log('Scores: ' + JSON.stringify(scores));
      return {name: 'move', args: [bestDir]};
    },

    unknown: function(name /* ...args */) {
      args = Array.prototype.slice.call(arguments, 1);
      console.error('Unknown message ' + name + ' with args', args);
    }
  };
}
