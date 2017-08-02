$(document).ready(function() {

  $('#add_player').click(function() {
    var modal = $('#admin_modal')
    var new_player_form = "<form class='form-horizontal' id='new_player_form' data-type='player' action='/admin/add-player'>" +
    "<div class='form-group'>" +
    "<label class='col-sm-2 control-label' for='player_name'>Name</label>" +
    "<div class='col-sm-9'>" +
    "<input id='player-name' class='form-control' name='name'>" +
    "</div></div>" +
    "</form>"
    modal.find("#admin_modal_title").text("New Player")
    modal.find(".modal-body").html(new_player_form)
    modal.find("#modal_submit").addClass("disabled")
    modal.modal("show");
  })

  $('#add_match').click(function() {
    var modal = $('#admin_modal')
    var players = "<option value='0'>Select Player</option>"
    $('.player').each(function(index) {
      players += "<option value='" + $(this).data("player-id") + "'>" + $(this).text() + "</option>"
    })
    var new_match_form = "<form class='form-horizontal' id='new_match_form' data-type='match' action='/admin/add-match'>" +
    "<div class='form-group'>" +
    "<label class='col-sm-2 control-label' for='player1'>Player 1</label>" +
    "<div class='col-sm-7'>" +
    "<select id='player1' class='form-control player_select' name='p1_id'>" + players + "</select>" +
    "</div><div class='col-sm-2'><input id='p2_score' class='form-control' type='number' name='p1_score' placeholder='Score'>" +
    "</div></div>" +
    "<div class='form-group'>" +
    "<label class='col-sm-2 control-label' for='player2'>Player 2</label>" +
    "<div class='col-sm-7'>" +
    "<select id='player2' class='form-control player_select' name='p2_id'>" + players + "</select>" +
    "</div><div class='col-sm-2'><input id='p2_score' class='form-control' type='number' name='p2_score' placeholder='Score'>" +
    "</div></div>" +
    "</form>"
    modal.find("#admin_modal_title").text("New Match")
    modal.find(".modal-body").html("<div class='alert alert-danger error'>Please choose two different players</div>" + new_match_form)
    modal.find("#modal_submit").addClass("disabled")
    modal.modal("show");
  })

  $('body').on("click", "#modal_submit:not(.disabled)", function() {
    console.log($(this))
    var url_target = $('.modal-body form').attr('action')
    var list_to_update = $('.modal-body form').data('type')
    var form_data = $('.modal-body form').serializeArray();
    var data = {}
    for(var i = 0; i < form_data.length; i++) {
      data[form_data[i].name] = form_data[i].value
    }
    $.ajax({
      data: data,
      url: url_target,
      method: "PUT",
      success: function(data) {
        $('#admin_modal').modal("hide")
        window.location.reload()
      }
    })
  })

  $('body').on("submit", "form", function(e) {
    e.preventDefault();
  })

  // Make sure the two player names are not the same or default
  $("body").on("change", ".player_select", function() {
    if ($("#player1").val() == $("#player2").val() && ($("#player1").val() != 0 || $("#player2").val() != 0)) {
      $(".modal-body .error").show();
      $(".modal-body .error").text("Please select two different players.")
      $('#admin_modal').find("#modal_submit").removeClass("disabled").addClass("disabled")
    }
    else if (!($("#player1").val() == 0 || $("#player2").val() == 0)) {
      $('.modal-body .error').hide();
      $('#admin_modal').find("#modal_submit").removeClass("disabled")
    }
    else {
      $('#admin_modal').find("#modal_submit").removeClass("disabled").addClass("disabled")
    }
  })

  $('body').on("blur", "#player-name", function() {
    if ($(this).val().trim().length > 0) {
      $('#admin_modal').find("#modal_submit").removeClass("disabled")
    }
    else {
      $('#admin_modal').find("#modal_submit").removeClass("disabled").addClass("disabled")
    }
  })
})
