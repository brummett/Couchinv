// Collection of subs useful for the picklist step and
// Fill picklist step

function show_picklist_order_count_by_warehouse(next_action) {

    var widget = $('<div/>');

    db.view('couchinv/warehouse-summary-byname?include_docs=true', { success: function(data) {
        var warehouse_doc_for_id = {};
        for (var i in data.rows) {
            var warehouseid = data.rows[i].id;
            warehouse_doc_for_id[warehouseid] = data.rows[i].doc;
        }
        get_number_of_orders_by_warehouse(warehouse_doc_for_id);
    }});

    function get_number_of_orders_by_warehouse(warehouse_doc_for_id) {
        db.view('couchinv/unshipped-order-docs-by-warehouseid-and-priority?group_level=1',
            { success: function(data) {
                var table_html = '<table><th><td>Warehouse</td><td>Unshipped orders</td></th>';
                var select_html = '<select id="warehouseid">';
                for (var i in data.rows) {
                    var warehouse_id = data.rows[i].key[0];
                    var count = data.rows[i].value;
                    table_html += '<tr><td>' + warehouse_doc_for_id[warehouse_id].name + '</td><td>' + count + '</td></tr>';
                    select_html += '<option value="' + warehouse_id + '">' + warehouse_doc_for_id[warehouse_id].name
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
                                    next_action(warehouse_doc_for_id[select.val()]);
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

function copy_warehouse_items(warehouse_items) {
    var copy = {};
    for (var barcode in warehouse_items) {
        copy[barcode] = warehouse_items[barcode];
    }
    return copy;
}

function warehouse_order_is_fillable(warehouse_items, order_items) {
    var short_items = warehouse_items_short_for_order(warehouse_items, order_items);
    return (short_items.length() == 0);
}

function warehouse_items_short_for_order(warehouse_items, order_items) {
    var short_items = {};
    var short_count = 0;
    for (var barcode in order_items) {
        if (warehouse_items[barcode] < order_items[barcode]) {
            short_items[barcode] = order_items[barcode] - warehouse_items[barcode];
            short_count++;
        }
    }
    short_items.length = function() { return short_count };
    return short_items;
}

function warehouse_commit_order_items(warehouse_items, order_items) {
    for (var barcode in order_items) {
        warehouse_items[barcode] -= order_items[barcode];
    }
}


