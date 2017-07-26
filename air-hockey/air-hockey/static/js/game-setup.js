$(document).ready(function() {
  /************************/
  /** Initial Page Setup **/
  /************************/
  // Whenever this page is loaded, clear the local storage
  localStorage.setItem("game_type", 0);
  localStorage.setItem("game_length", 0);
  localStorage.setItem("player1_id", 0);
  localStorage.setItem("player2_id", 0);

  // Set up the game info object.
  // when that's full, the game can start.
  var game_info = {
    "game_length": 0,
    "game_type" : 0,
    "player1_id": 0,
    "player2_id": 0,
    "player1_name": "",
    "player2_name": "",
    "table_ready": 0,
    "guest_ready": 0
  };

  function isGameReady() {
    if (game_info.guest_ready == 0) {
      $("#guest").addClass("disabled");
    }
    else {
      $("#guest").removeClass("disabled");
    }
    if (game_info.game_length != 0 &&
        game_info.game_type != 0 &&
        game_info.player1_id != 0 &&
        game_info.player2_id != 0)
    {
        $("#game-ready").removeClass().addClass("alert alert-success");
        $("#game-ready").text("Game Ready");
        if (game_info.table_ready != 1) {
          $("#start").removeClass("disabled");
          $("#start").addClass("disabled");
          $('#guest').removeClass("disabled").addClass("disabled");
        }
        else {
          $("#start").removeClass("disabled");
        }
    }
    else {
      $("#start").removeClass("disabled");
      $("#start").addClass("disabled");
    }
  }

  /***************************/
  /**** Side-menu buttons ****/
  /***************************/
  // Guest and Start saves the game-info object to local storage and goes to the score screen
  $("#start").click(function() {
    if ($(this).hasClass("disabled")) {
      return false;
    }
    localStorage.setItem("game_type", game_info.game_type);
    localStorage.setItem("game_length", game_info.game_length);
    localStorage.setItem("player1_id", game_info.player1_id);
    localStorage.setItem("player2_id", game_info.player2_id);
    localStorage.setItem("player1_name", game_info.player1_name);
    localStorage.setItem("player2_name", game_info.player2_name);

    window.location.href = "/current-game";
  });

  //If guest was clicked, save "0"s to the player ids
  $("#guest").click(function() {
    if ($(this).hasClass("disabled")) {
      return false;
    }
    localStorage.setItem("game_type", game_info.game_type);
    localStorage.setItem("game_length", game_info.game_length);
    localStorage.setItem("player1_id", 0);
    localStorage.setItem("player2_id", 0);
    localStorage.setItem("player1_name", "Player 1");
    localStorage.setItem("player2_name", "Player 2");

    window.location.href = "/current-game";
  })
  // Reset sets everything to 0 (except for table ready)
  $("#reset").click(function() {
    game_info.game_length = 0;
    game_info.game_type = 0;
    game_info.player1_id = 0;
    game_info.player2_id = 0;
    game_info.guest_ready = 0;
    $("#game-ready").removeClass().addClass("alert alert-warning");
    $("#game-ready").text("Game Options Not Yet Selected");
    $("#player1").val("0");
    $("#player2").val("0");
    $(".active").removeClass("active");
    $(".deselected").removeClass("deselected");
    isGameReady();
  });

  /***************************/
  /**** Game Options Init ****/
  /***************************/
  // Get all the players we have first.
  $.ajax({
    method: "GET",
    url: "http://admin.itovi/api/game/game-setup",
    // data: {
    //   "auth-token": "3ff3c250-5b9d-4ce7-a322-c3879575024f"
    // },
    success: function(result) {
      result = JSON.parse(result);
      var players = result.players;
      var output = [];
      var length = players.length;
      for(var i=0; i < length; i++)
      {
        output[i] = "<option value='"+ players[i].player_id +"'>"+ players[i].username + "</option>";
      }
      output.unshift("<option value='0'>Select Player</option>");

      $("#player1").get(0).innerHTML = output.join("");
      $("#player2").get(0).innerHTML = output.join("");
    },
    error: function(result) {
      console.log(result);
    },
  });


  function sse() {
      var source = new EventSource('/stream');
      source.onmessage = function(e) {
        console.log(e.data);
        if (e.data != 1) {
          $('#table-ready').text("Table Ready");
          $('#table-ready').removeClass("alert-danger").addClass("alert-success");
          game_info.table_ready = 1;
          isGameReady();
        }
      };
  }
  // Every 5 seconds, check to make sure the table is ready.
  // the table sends a 0 value to the current_match table, it's fine.
  // setInterval(function() {
  //   $.ajax({
  //     method: "GET",
  //     url: "/api/game/check-table/",
  //     success: function(result) {
  //       console.log(result)
  //       if (result == "true") {
  //         $('#table-ready').text("Table Ready");
  //         $('#table-ready').removeClass("alert-danger").addClass("alert-success");
  //         game_info.table_ready = 1;
  //         console.log(game_info)
  //         isGameReady();
  //       }
  //       else {
  //         $('#table-ready').text("Table Not Ready");
  //         $('#table-ready').removeClass("alert-success").addClass("alert-danger");
  //         game_info.table_ready = 0;
  //         isGameReady();
  //         console.log(game_info);
  //       }
  //     },
  //     error: function(error) {
  //       console.log(error);
  //     }
  //   })
  // }, 5000)

  // Make sure the two player names are not the same or default
  $(".player-select").change(function() {
    if ($("#player1").val() == $("#player2").val() && ($("#player1").val() != 0 || $("#player2").val() != 0)) {
      $("#game-ready").removeClass("alert-warning").addClass("alert-danger")
      $("#game-ready").text("Players cannot be the same");
      game_info.player1_id = 0;
      game_info.player2_id = 0;
      game_info.player1_name = "";
      game_info.player2_name = "";
    }
    else if ($("#player1").val() == 0 || $("#player2").val() == 0) {
      if ($("#game-ready").hasClass("alert-danger")) {
        $("#game-ready").removeClass("alert-danger")
      }
      else if ($("#game-ready").hasClass("alert-success")) {
        $("#game-ready").removeClass("alert-success");
      }
      $("#game-ready").addClass("alert-warning");
      $("#game-ready").text("Game Options Not Yet Selected");
      game_info.player1_id = $("#player1").val();
      game_info.player2_id = $("#player2").val();
      game_info.player1_name = $('#player1 option:selected').text();
      game_info.player2_name = $('#player2 option:selected').text();
    }
    else {
      game_info.player1_id = $("#player1").val();
      game_info.player2_id = $("#player2").val();
      game_info.player1_name = $('#player1 option:selected').text();
      game_info.player2_name = $('#player2 option:selected').text();
    }
    isGameReady();
  })

  // Save the game type when a game button is pressed
  // values are 1 = 5pt, 2 = 7pt, 3 = 10pt, 4 = 5min, 5 = 10min
  $(".length-options button").click(function() {
    switch($(this).val()) {
      case "1":
        game_info.guest_ready = 1;
        game_info.game_type = 1;
        game_info.game_length = 5;
        break;
      case "2":
        game_info.guest_ready = 1;
        game_info.game_type = 1;
        game_info.game_length = 7;
        break;
      case "3":
        game_info.guest_ready = 1;
        game_info.game_type = 1;
        game_info.game_length = 10;
        break;
      case "4":
        game_info.guest_ready = 1;
        game_info.game_type = 2;
        game_info.game_length = 5;
        break;
      case "5":
        game_info.guest_ready = 1;
        game_info.game_type = 2;
        game_info.game_length = 10;
        break;
      default:
        game_info.guest_ready = 0;
        game_info.game_type = 0;
        game_info.game_length = 0;
    }
    $(".active").removeClass("active");
    $(".deselected").removeClass("deselected");
    $(this).addClass("active");
    $(".length-options button:not(.active)").addClass("deselected");
    isGameReady();
  })

  sse();
})
