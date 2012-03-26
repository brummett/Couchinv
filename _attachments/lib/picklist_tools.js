// Collection of subs useful for the picklist step and
// Fill picklist step

function show_picklist_order_count_by_warehouse(next_action) {

    var widget = $('<div/>');

    db.view('couchinv/warehouse-summary-byname', { success: function(data) {
        var warehouse_map = {};
        for (var i in data.rows) {
            var warehouseid = data.rows[i].id;
            var name = data.rows[i].key;
            warehouse_map[name] = warehouseid;
            warehouse_map[warehouseid] = name;
        }
        get_number_of_orders_by_warehouse(warehouse_map);
    }});

    function get_number_of_orders_by_warehouse(warehouse_map) {
        db.view('couchinv/unshipped-order-docs-by-warehouseid-and-priority?group_level=1',
            { success: function(data) {
                var table_html = '<table><th><td>Warehouse</td><td>Unshipped orders</td></th>';
                var select_html = '<select id="warehouseid">';
                for (var i in data.rows) {
                    var warehouse_id = data.rows[i].key[0];
                    var count = data.rows[i].value;
                    table_html += '<tr><td>' + warehouse_map[warehouse_id] + '</td><td>' + count + '</td></tr>';
                    select_html += '<option value="' + warehouse_id + '">' + warehouse_map[warehouse_id]
                                + '</option>';
                }
                table_html += '</table>';
                select_html += '</select>';
                var table = $(table_html);

                var form = $('<form><span>Generate picklist for</span></form>');
                var select = $(select_html);
                form.append(select);

                var button = $('<input type="submit" id="submit" value="Get Picklist"/>');
                button.click((function (select) {
                                return function(event) {
                                    event.preventDefault();
                                    next_action(select.val());
                                }
                            })(select));
                form.append(button);

                widget.append('<p>Unshipped orders by warehouse</p>');
                widget.append(table);
                widget.append('<p>Pick a warehouse to generate a picklist</p>');
                widget.append(form);
            }}
        );
    }

    return widget;
}
