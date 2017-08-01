$(document).ready(function() {

  // debugger;

  // $('#admin_modal').modal()

  $('#add_player').click(function() {
    var modal = $('#admin_modal')
    var new_player_form = "<form class='form-horizontal' id='new_player_form' action='/admin/add-player' method='post'>" +
    "<div class='form-group'>" +
    "<label class='col-sm-2 control-label' for='player_name'>Name</label>" +
    "<div class='col-sm-9'>" +
    "<input id='player-name' class='form-control' name='name'>" +
    "</div></div>" +
    "</form>"
    modal.find("#admin_modal_title").text("New Player")
    modal.find(".modal-body").html(new_player_form)
    modal.modal("show");
  })

  $('#modal_submit').click(function() {
    var url_target = $('.modal-body form').attr('action')
    var form_data = $('.modal-body form').serializeArray();
    var data = {}
    for(var i = 0; i < form_data.length; i++) {
      data[form_data[i].name] = form_data[i].value
    }
    console.log(data)
    $.ajax({
      data: data,
      url: url_target,
      method: "PUT"
    })
  })
})
