
function build_fillpicklist_activity() {
    var activity = $('div#activity');
    activity.empty();

    show_picklist_order_count_by_warehouse(
        function(warehouse_doc) {
            db.view('couchinv/unshipped-order-docs-by-warehouseid-and-priority'
                    + '?reduce=false&start_key=["' + warehouse_doc._id + '"]',
                { success: function(unshipped_order_data) {
                            fill_picklist_for_warehouse(warehouse_doc, unshipped_order_data)
                }});
        }
    ).appendTo(activity);

    function fill_picklist_for_warehouse(warehouse_doc, unshipped_order_data) {
        activity.empty();
        if (! unshipped_order_data.rows.length) {
            activity.append('<p>No outstanding orders for that warehouse</p>');
            return false;
        }

        var available = copy_warehouse_items(warehouse_doc.inventory);
        var inventory_adjustments = {};  // for each filled order, how man to adjust the warehouse inventory down
        var ul = $('<ul class="order-picker"/>');
        activity.append(ul);

        activity.append('<div id="picklist-filler"/>');

        var orders_by_id = {};
        $.each(unshipped_order_data.rows, function(idx,order_row) {
            var order = order_row.value;
            orders_by_id[order._id] = order;
            var item_count = 0;
            $.each(order.items, function(idx,count) {
                item_count += count;
            });
            var li = $('<li id="' + order._id + '"><span>' + order.ordernumber + '</span><span>' + item_count + ' items</span></li>');

            li.addClass( warehouse_order_is_fillable(available, order.items) ? 'fillable-order' : 'short-order');
            if (order.shipservicelevel == 'expedited') {
                li.addClass('expedited-shipping');
            } else if (order.shipservicelevel == 'overnight') {
                li.addClass('overnight-shipping');
            }

            ul.append(li);
        });

        ul.click(selected_a_picklist);

        var picklist_has_changes = false;

        function selected_a_picklist(event) {
            var li = $(event.target).closest('li');

            if (picklist_has_changes) {
                var popup = new EditableForm({
                                title: 'Unsaved Changes',
                                modal: 1,
                                fields:[{ type: 'label', label: 'This picklist has unsaved changes'}],
                                buttons: [{ id: 'ok', label: 'Change picklist', action: 'submit' },
                                          { id: 'cancel', label: "Don't change", action: 'remove'}],
                                submit: function() { fill_selected_picklist(li) }
                            });
            } else {
                fill_selected_picklist(li);
            }
        };
                
        function fill_selected_picklist(li) {
            picklist_has_changes = false;

            $('li.selected').removeClass('selected');
            li.addClass('selected');

            var order = orders_by_id[li.attr('id')];

            
            var picklist_filler = $('div#picklist-filler');
            picklist_filler.empty();

            picklist_filler.append('<table><tr><td>Name</td><td>' + order.customername + '</td></tr>'
                                    + '<tr><td>Box ID</td><td>' + order.boxid + '</td></td>'
                                    + '<tr><td>Shipping</td><td>' + order.shipservicelevel + '</td></tr>'
                                    + '</table>');

            var form = new ItemTransactionForm({
                title: 'Order ' + order.ordernumber,
                layout: [   { type: 'label', label: 'Items to fill' },
                            { type: 'itemlist', id: 'unfilled_items', modifiable: false },
                            { type: 'label', label: 'Filled items' },
                            { type: 'itemlist', id: 'filled_items', modifiable: false },
                            { type: 'text', label: 'Pounds', id: 'weight_pounds', required: true },
                            { type: 'text', label: 'Ounces', id: 'weight_ounces', required: true },
                            { type: 'button', label: 'Done packing', id: 'alldone', action: submit_form_1 }
                        ]
            });

            form.draw(picklist_filler);
            var unfilled_items = form.widget['unfilled_items'];
            var filled_items = form.widget['filled_items'];

            $.each(order.items, function(barcode, count) {
                unfilled_items.__add_scan(barcode, count);
            });

            function make_toggle_item(this_widget, other_widget) {
                return function (event) {
                    var li = $(event.target).closest('li');
                    var barcode = li.attr('data-item-ident');

                    if (this_widget.__items_in_list[barcode] > 0) {
                        picklist_has_changes = true;
                        this_widget.__subtract(barcode);
                        other_widget.__add_scan(barcode);
                        if (this_widget.__items_in_list[barcode] == 0) {
                            this_widget.__delete(barcode);
                        }
                    }
                }
            }

            unfilled_items.click(make_toggle_item(unfilled_items, filled_items));
            filled_items.click(make_toggle_item(filled_items, unfilled_items));
        }

        function submit_form_1 () {
        }

    }



    function currency(n) {
        n = parseFloat(n);
        if (isNaN(n)) {
            n = '0.00';
        } else {
            n = n.toFixed(2);
        }
        return n;
    }

}
