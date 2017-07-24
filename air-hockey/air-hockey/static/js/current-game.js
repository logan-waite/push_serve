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
    $('#length-box').text(time_array[0] + ":" + zeroPad(time_array[1], 2));
    var time_left = $('#length-box').text()
    setTimeout(function() {
      var gameTimer = setInterval(function() {
        if (time_array[0] == 0 && time_array[1] == 0) {
          clearInterval(gametimer)
          gameOver();
        }
        if (time_array[1] == 0) {
          time_array[0] -= 1;
          time_array[1] == 59;
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

  function gameOver() {
    $('#countdown').text("Game Over").css("font-size", "180px").css("top", "48%");
    // $('.overlay').show();
    $('#countdown').show();
    var player1_score = $('#player1 .score').text();
    var player2_score = $('#player2 .score').text();
    var data = {}
    data['p1_id'] = player1_id;
    data['p2_id'] = player2_id;
    data['p1_score'] = player1_score;
    data['p2_score'] = player2_score;
    var dataJSON = JSON.stringify(data);
    // $.ajax({
    //   url: '/api/air-hockey/add-match',
    //   method: "POST",
    //   data: dataJSON,
    //   complete: function(result) {
    //     $.ajax({
    //       method: "GET",
    //       url: "/api/update-game/clear-game/"
    //     })
    //     console.log(result);
    //   },
    //   error: function(error) {
    //     console.log(error);
    //   }
    // })
    setTimeout(function() {
      $('.buttons').show();
    }, 2000)

  }





  initializeGame();
  // We kinda want to run this after everything else to make sure
  // Everyhting is ready.
  sse();
})
