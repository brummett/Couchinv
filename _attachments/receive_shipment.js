function build_receive_activity() {
    var activity = $("#activity");
    activity.empty();

    receive_shipment_form();
}

function receive_shipment_form (doctoedit) {
    var activity = $("#activity");
    activity.empty();

    db.view("couchinv/warehouse-summary-byname",
        { success: function(warehouse_data) {

            var warehouse_select = '<select name="warehouseid">';
            $.each(warehouse_data.rows, function(idx,row) {
                warehouse_select = warehouse_select + '<option value="' + row['id'] + '"';
                if (doctoedit && doctoedit.warehouseid == row['id']) {
                    warehouse_select = warehouse_select + ' selected="selected"';
                }
                warehouse_select = warehouse_select + '>' + row['key'] + '</option>';
            });
            warehouse_select = warehouse_select + '</select>';
            
            var now = new Date();
            var datestr = now.getFullYear() + '-'
                       + (now.getMonth() < 10 ? '0' : '') + now.getMonth() + '-'
                       + (now.getDate() < 10 ? '0' : '') + now.getDate();

            var formhtml = '<h1>' + (doctoedit ? 'Edit Received' : 'Receive') + ' Shipment</h1>'
                + '<div id="orderdata"><table><tr><td>Date</td>'
                + '<td><input name="date" id="date" type="text" value="'
                    + (doctoedit ? doctoedit.date : datestr)
                    + '"/></td></tr>'

                + '<tr><td>Order number</td>'
                + '<td><input name="ordernumber" id="ordernumber" type="text" value="'
                    + (doctoedit ? doctoedit.ordernumber : '')
                    + '"/></td></tr>'

                + '<tr><td>Received to</td><td>' + warehouse_select + '</td></tr>'

                + '</table></div>'
                + '<div id="scanitems"><form id="scanitems"><input type="text" id="itemscan"/>'
                    + '<input type="submit" value="Scan" id="submitscan"/></form></div'
                + '<div id="orderdetails"><ul id="orderdetails></ul></div>'
                + '<input type="submit" id="submitorder" value="All Done"/>';

            activity.append(formhtml);
            $("input#ordernumber").focus();

            var itemscan = $("input#itemscan");
            var itemdetails = $("ul#orderdetails");
            $("form#scanitems").submit(function(event) {
                // When an item is submitted to the Scan
                event.preventDefault();
            });

            $("input#submitorder").click( function(event) {
                // When the order is complete

                event.perventDefault();
            });

        }});
}
