$(document).ready(function() {

    $("input[type=checkbox]").change(function(){

        var current_status = $(this).prop("checked")
        $("input[type=checkbox]").not($(this)).prop("checked", !current_status);

        var qty_status = $("#enableqty").prop("checked");
        if (qty_status){
            $("#count-input").prop('disabled', true);

        } else{
            $("#count-input").prop('disabled', false);
        }

        var temp = $("input[name=number]");
        for (var i = 0; i < temp.length; i++) {
            temp[i].disabled = qty_status;
        }
        // Enables quantity inputs
        temp = $("input[name=qty]");
        for (var i = 0; i < temp.length; i++) {
            temp[i].disabled = !qty_status;
        }
    });

    function form_validate(){
        temp_state = true;
        var qty_calculation_status = $("#enableqty").prop("checked");
        var el;
        if (qty_calculation_status){
            el = $("#content-table input").not("#content-table input[name=number]");
        } else{
            el = $("#content-table input").not("#content-table input[name=qty]");
        }

        el.each( function () {
            if ($(this).val().length < 1){
                $(this).addClass("is-invalid");
                show_error_message("Error", "The selected fields must be filled in");
                temp_state *= false;
            } else {
                $(this).removeClass("is-invalid");
                temp_state *= true;
            }
    
        })
        if (!qty_calculation_status){
            var percent_arr = $("input[name=number]");

            var tot = 0;

            for (var i = 0; i < percent_arr.length; i++) {
                if (parseInt(percent_arr[i].value))
                    tot += parseInt(percent_arr[i].value);
            }

            if (!(tot === 100)){
                temp_state *= false;
                show_error_message("Error", "The sum of the percentages must be 100.");
            }
        }

        return temp_state;
        
    }

    function get_input_data(){
        var temp_sheet = []
        var el = $("#content-table .row");
        el.each( function () {
            var temp_row = [];
            $(this).find("input").each( function (){
                if(!$(this).is(':checkbox')){
                    console.log(this);
                    temp_row.push($(this).val());
                }
            });
            temp_sheet.push(temp_row);
    
        })
        return temp_sheet;
    }

    function shuffle(array1, array2) {
        for (let i = array1.length - 1; i > 0; i--) {
          let j = Math.floor(Math.random() * (i + 1)); // случайный индекс от 0 до i
      
          [array1[i], array1[j]] = [array1[j], array1[i]];
          [array2[i], array2[j]] = [array2[j], array2[i]];
        }
        return [array1, array2];
      }

    function render_sids_contents(data, qty){
        console.log(data);
        temp_sids = [];
        temp_content = [];

        if ($("#enableqty").prop("checked")){
            for (var i = 0; i < data.length; i++){
                for ( var k = 0; k < data[i][3]; k++){
                    temp_sids.push(data[i][0]);
                    temp_content.push(data[i][1]);
                }
            }
        } else{
            var multiplier = qty / 100;

            for (var i = 0; i < data.length; i++){
                for ( var k = 0; k < Math.round(data[i][2]*multiplier); k++){
                    temp_sids.push(data[i][0]);
                    temp_content.push(data[i][1]);
                }
            }
        }

        const [sids, content] = shuffle(temp_sids, temp_content);
        $("#sid_list").text(sids.join([separator = ';']));
        $("#content_list").text(content.join([separator = ';']));

    }
    
    function generate(){
        var count = $("#count-input").val();
        
        if (count >= 1){

            if (form_validate()) {
                render_sids_contents(get_input_data(), count);
            };
            
        } else {
            show_error_message("Error", "Enter a quantity greater than 1"); 
        }
    }


    check_percent_input();
    check_qty_input();

    $("#randomize").click(function(){
        generate();
    });
    
    $("#add_new_row").click(function(){

        var number_status = "";
        var qty_status = "";

        if ($("#enableqty").prop("checked")){
            number_status = 'disabled';
        } else{
            qty_status = "disabled";
        }

        var new_row_html = '<div class="row my-1">'+
                                '<div class="col-3">'+
                                    '<input type="text" name="SID" class="form-control" placeholder="SID" required>'+
                                    '</div>'+
                                    '<div class="col-4">'+
                                        '<input type="text" name="content" class="form-control" placeholder="Text" required>'+
                                    '</div>'+
                                    '<div class="col-2">'+
                                        '<input type="number" name="number" class="form-control" placeholder="%" min="1" max="100" '+ number_status +'>'+
                                    '</div>'+
                                    '<div class="col-2">'+
                                    '<input type="number" name="qty" class="form-control" placeholder="qty" min="1" max="100" '+ qty_status +'>'+
                                    '</div>'+
                                    '<div class="col-1">'+
                                        '<button class="btn btn-outline-danger delete-row-btn">X</button>'+
                                    '</div>'+
                                '</div>';

        $("#content-table").append(new_row_html);

        $(".delete-row-btn").click(function(){
            $(this).parent().parent().remove();
        });

        check_percent_input();
        check_qty_input();

        $("#randomize").click(function(){
            generate();
            
        });
    }); 

});


function check_percent_input(){
    $("input[name='number']").change(function(){
        if ((this.value > 100) || (this.value < 1)) {
            show_error_message("Error", "Valid range from 1 to 100%"); 
            if (this.value > 100){
                this.value = 100;
            } else { 
                this.value = null;
            }
        }       
    });
    return true;
}


function check_qty_input(){
    $("input[name='qty']").change(function(){
        if (this.value < 1) {
            show_error_message("Error", "Valid range from 1"); 
            this.value = null;
        } else {
            var temp = $("input[name='qty']");
            sum = 0;
            for (var i = 0; i < temp.length; i++) {
                var value_to_add; 
                if ((temp[i].value == null) || (temp[i].value == "")){
                    value_to_add = 0;
                } else{
                    value_to_add = parseInt(temp[i].value)
                }
                sum += value_to_add;
            }
            $("#count-input").val(sum);
        }      
    });
    return true;
}

function show_error_message(title, msg){
    $("#message-box-header").text(title);
    $("#message-box-content").text(msg);
    $("#message-box").removeClass('d-none');
    setTimeout(() => {
        $("#message-box").addClass('d-none');
    }, 3000);
}