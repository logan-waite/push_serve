function zeroPad(num, numZeros) {
    var n = Math.abs(num);
    var zeros = Math.max(0, numZeros - Math.floor(n).toString().length );
    var zeroString = Math.pow(10,zeros).toString().substr(1);
    if( num < 0 ) {
        zeroString = '-' + zeroString;
    }

    return zeroString+n;
}

$(document).ready(function() {
  // Get information from local storage and then from the server to set up the board
  var game_type = localStorage.getItem("game_type");
  var game_length = localStorage.getItem("game_length");
  var player1_id = localStorage.getItem("player1_id");
  var player2_id = localStorage.getItem("player2_id");
  var player1_name = localStorage.getItem("player1_name");
  var player2_name = localStorage.getItem("player2_name");

  /***************/
  /** Functions **/
  /***************/

  // This is what's going to keep the connection open
  // between the scoring server and the front-end client
  function sse() {
      var source = new EventSource('/stream');
      source.onmessage = function(e) {
        console.log(e.data);
        var scorer = (e.data.split("'"))[1];
        var player_score = "#player" + scorer + " .score";
        var current_score = $(player_score).text()
        $(player_score).text(++current_score);
        if (game_type == 1) {
          if ($(player_score).text() >= game_length) {
            gameOver();
          }
        }
      };
      return source;
  }

  function initializeGame() {
    $('#player1 .name').text(player1_name);
    $('#player2 .name').text(player2_name);
    if (game_type == 1) {
      startScored();
    }
    else if (game_type == 2) {
      startTimed();
    }
  }

  function startScored() {
    $('#length-box').text("Game to " + game_length);
    initiateCountdown();
  }

  function startTimed() {
    var time_array = [game_length, 0];
    time_array[0] = 1; // for testing
    $('#length-box').text(time_array[0] + ":" + zeroPad(time_array[1], 2));
    var time_left = $('#length-box').text()
    setTimeout(function() {
      var gameTimer = setInterval(function() {
        $('#length-box').text(time_array[0] + ":" + zeroPad(time_array[1], 2))
        if (time_array[0] == 0 && time_array[1] == 0) {
          clearInterval(gameTimer)
          gameOver();
        }
        else if (time_array[1] == 0) {
          time_array[0] -= 1;
          time_array[1] = 59;
        }
        else {
          time_array[1] -= 1;
        }
      }, 1000)
    }, 4000)
    initiateCountdown();

  }

  function initiateCountdown(timed) {
    var number = 3;
    var countdownInterval = setInterval(function() {
      if (number === 0) {
        number = "Go"
      }
      else if (isNaN(number)) {
        $('#countdown').hide();
        $('.overlay').hide();
        clearInterval(countdownInterval);
      }
      $('.current #countdown').text(number);
      number--;
    }, 1000);
  }

  $('#replay').click(function() {
    window.location.reload();
  })

  $('#new_game').click(function() {
    window.location.href="/"
  })

  initializeGame();
  // We kinda want to run this after everything else to make sure
  // Everyhting is ready.
  var event_source = sse();

  function gameOver() {
    event_source.close();
    $('#game-over').text("Game Over");
    $('.overlay').css("opacity", "1").show();
    $('#game-over').show();
    var player1_score = $('#player1 .score').text().trim();
    var player2_score = $('#player2 .score').text().trim();
    var player1_name = $('#player1 .name').text().trim();
    var player2_name = $('#player2 .name').text().trim();
    var winner = {name: "", score: 0}
    var loser = {name: "", score: 0}

    if (player1_score >= player2_score) {
      winner.name = player1_name;
      winner.score = player1_score;
      loser.name = player2_name;
      loser.score = player2_score;
    }
    else {
      winner.name = player2_name;
      winner.score = player2_score;
      loser.name = player1_name;
      loser.score = player1_score;
    }
    var data = {}
    data['p1_id'] = player1_id;
    data['p2_id'] = player2_id;
    data['p1_score'] = player1_score;
    data['p2_score'] = player2_score;
    console.log(player2_score)
    var dataJSON = JSON.stringify(data);
    $.ajax({
      url: "/end-game",
      method: "POST",
      data: dataJSON
    })

    setTimeout(function() {
      $('#winner-name').text(winner.name);
      $('#winner-score').text(winner.score);
      $('#loser-name').text(loser.name);
      $('#loser-score').text(loser.score);
      $('#game-over').hide();
      $('#end-game').show();
    }, 2000)

  }
})
