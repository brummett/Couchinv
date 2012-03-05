var db = $.couch.db("couchinv");

var activities = [ { name: 'Home', url: 'index.html' },
                   { name: 'Inventory Items', url: 'inventory_items.html' },
                   { name: 'Customers', url: 'customers.html' },
                   { name: 'Warehouses', url: 'warehouses.html' },
                   { name: 'Receive Shipment', url: 'receive_shipment.html' }
                ];

function navigation_run () {

    var loc = window.location;
    var regex = new RegExp('\\w+\\.html$');
    var this_page = regex.exec(loc.pathname);

    var html = '';
    $.each(activities, function(index, act) {
        html += '<div><span class="navigation';
        if (this_page == act.url) {
            html += ' current_activity">' + act.name;
        } else {
            html += '"><a href="' + act.url + '">' + act.name + '</a>';
        }
        html += '</span></div>';
    });
    $("#navigation").append(html);
    
}

$(document).ready(function() {
  navigation_run();
});
