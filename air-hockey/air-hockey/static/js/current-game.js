$(document).ready(function() {
  function sse() {
      var source = new EventSource('/stream');

      source.onmessage = function(e) {
        console.log(e.data);
        var scorer = (e.data.split("'"))[1];
        var player_score = "#player" + scorer + " .score";
        var current_score = $(player_score).text()
        $(player_score).text(++current_score);

      };
  }

  $("#player1scored").click(function() {
    console.log("clicked")
    $.post('/score', { 'p': 1 });
  })

  $("#player2scored").click(function() {
    console.log("clicked")
    $.post('/score', { 'p': 2 });
  })

  sse();
})
