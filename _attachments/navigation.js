var db = $.couch.db("couchinv");

var activity_names = [ 'Inventory Items', 'Customers' ];
var activities = {
    'Inventory Items': build_item_activity,
    'Customers': build_customer_activity
};

function navigation_run () {
    var html = '';
    $.each(activity_names, function(index, name) {
        html = html +'<div><a href="#" id="' + name + '">'
                    + name + '</a></div>';
    });
    html = html + '</div>';
    $("#navigation").append(html);
    
    $("#navigation a").bind('click', function(event) {
        var target = $(event.target);
        var name = target.attr('id');
        if (target.hasClass("current_activity")) {
            // Don't "follow" the link to the current event
            event.preventDefault();
            return false;
        }
        $("#navigation a").removeClass("current_activity");
        target.addClass("current_activity")
        var next_activity = activities[name];
        next_activity();
        return false;
    });
}

$(document).ready(function() {
  navigation_run();
});
