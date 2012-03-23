// Generate a page with the unshipped orders in the order they should
// be filled

function build_picklist_activity() {
    var activity = $('div#activity');
    activity.empty();

    // First, collect all the names of 
    // and an option list to pick which you want to show the picklist for
    db.view('couchinv/warehouse-summary-byname', {success: function(data) {
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
                form.append(select_html);

                var button = $('<input type="submit" id="submit" value="Get Picklist"/>');
                button.click((function(select) {
                    return function(event) {
                        db.view('couchinv/unshipped-order-docs-by-warehouseid-and-priority'
                                + '?reduce=false&start_key=["' + select.val() + '"]',
                            { success: generate_picklist_for_warehouse });
                        return false;
                    }
                })(form.find('select')));
                form.append(button);

                activity.append('<p>Unshipped orders by warehouse</p>');
                activity.append(table);
                activity.append('<p>Pick a warehouse to generate a picklist</p>');
                activity.append(form);
            }}
        );
    }

    function generate_picklist_for_warehouse(unshipped_order_data) {
        activity.empty();
        if (! unshipped_order_data.rows.length) {
            activity.append('<p>No outstanding orders for that warehouse</p>');
            return false;
        }

        warehouseid = unshipped_order_data.rows[0].id;
        db.openDoc(warehouseid, { success: (function(unshipped_order_data) {
            return function(warehouse) {
                // make a copy of the available items in this warehouse
                var available = {};
                for (var barcode in warehouse.items) {
                    available[barcode] = warehouse.items[barcode];
                }

                var fillable_orders = [];   // orders we can fill completely
                var short_orders = [];      // orders we don't have everything for

                // for each order, already sorted by priority
                for (var i in unshipped_order_data.rows) {
                    var this_order = unshipped_order_data.rows[i].value;

                    var is_fillable = true;
                    for (var barcode in this_order.items) {
                        if (available[barcode] < this_order.items[barcode]) {
                            is_fillable = false;
                            break;
                        }
                    }

                    if (is_fillable) {
                        // adjust the available for each item in this order
                        for (var barcode in this_order.items) {
                            available[barcode] -= this_order.items[barcode];
                        }
                        fillable_orders.push(this_order);
                    } else {
                        short_orders.push(this_order);
                    }
                }

                fill_in_item_details_for_barcode = (function() {
                    var item_fillers = {};
                    return function (barcode, selector) {
                        if (!item_fillers[barcode]) {
                            item_fillers[barcode] = new DeferredDbAction(db.view, 'couchinv/items-by-barcode?key="' + barcode + '"');
                        }
                        item_fillers[barcode].enqueue(function(data) {
                                                    $(selector).find('span.name').text(data.rows[0].value.name);
                                                    $(selector).find('span.sku').text(data.rows[0].value.sku);
                                                });
                    }
                })();
                    

                var make_order_appender = function(ul_selector, order) {
                    var ul = $(ul_selector);
                    return function(customer_doc) {
                        var customer_name;
                        if (customer_doc.firstname && customer_doc.lastname) {
                            customer_name = customer_doc.firstname + ' ' + customer_doc.lastname;
                        } else if (customer_doc.firstname) {
                            customer_name = customer_doc.firstname;
                        } else {
                            customer_name = customer_doc.lastname;
                        }

                        var item_count = 0;
                        for (var barcode in order.items) { item_count++ };

                        order.boxid = get_next_box_id();

                        var html = '<li id="' + order.ordernumber + '"><div class="order-overview">'
                                    + (order.ordersource ? order.ordersource : '')
                                    + ' order number ' + order.ordernumber + ' on ' + order.date + '</div>'
                                    + '<div class="order-remainder">'
                                        + '<div class="name-addr">' + customer_name + '<br>'
                                            + customer_doc.address + '</div>'
                                        + '<div class="box-and-phone"><span>Box num: ' + order.boxid
                                            + '</span><span>weight:</span>'
                                            + '<br><span>invoice number</span>'
                                            + '<br><span>phone: ' + customer_doc.phonenumber + '</span><span>'
                                            + customer_doc.email + '</span></div>'
                                    + '</div>'
                                    + '<div class="items">' + item_count + ' items in order<ul class="order-items">';
                        var price_total_cents = 0;
                        for (var barcode in order.items) {
                            var subtotal_cents = order.items[barcode] * order.prices_cents[barcode];
                            price_total_cents += subtotal_cents;
                            html += '<li><span class="count">(' + order.items[barcode]
                                + ')</span><span class="sku"/><span class="price">$' + currency(subtotal_cents / 100)
                                + '</span><span class="name"/></li>';
                            fill_in_item_details_for_barcode(barcode, 'li#' + order.ordernumber + ' ul.order-items');
                        }
                        html += '</ul></div>' + order.shipservicelevel
                            + ' shipping $' + currency(order.shippingcharge_cents / 100)
                            + ' Total $' + currency((price_total_cents + order.shippingcharge_cents) / 100)
                            + '</div></li>';
                        var this_order_li = $(html);
                        this_order_li.appendTo(ul);
                    }
                };

                activity.append('<div class="picklist">' + fillable_orders.length
                            + ' orders to fill<ul class="orders" id="fillable-orders"/>Orders we cannot fill yet<ul class="orders" id="short-orders"/></div>');


                var customer_getters = {};
                for (var i in fillable_orders) {
                    var order = fillable_orders[i];
                    var appender = make_order_appender('ul#fillable-orders', order);
                    var customerid = order.customerid;
                    if (! (customerid in customer_getters)) {
                        customer_getters[customerid] = new DeferredDbAction(db.openDoc, customerid);
                    }
                    customer_getters[customerid].enqueue(appender);
                    //db.openDoc(order.customerid, { success: appender });
                }

                for (var i in short_orders) {
                    var order = short_orders[i];
                    var appender = make_order_appender('ul#short-orders', order);
                    var customerid = order.customerid;
                    if (! (customerid in customer_getters)) {
                        customer_getters[customerid] = new DeferredDbAction(db.openDoc, customerid);
                    }
                    customer_getters[customerid].enqueue(appender);
                    //db.openDoc(order.customerid, { success: appender });
                }
            }

        })(unshipped_order_data) });
    }

                    
    var box_id = 'A';
    function get_next_box_id() {
        var retval = box_id;
        // Increment to the next in the sequence
        if (box_id == 'Z') {
            box_id = 'AA';
        } else {
            box_id = String.fromCharCode(box_id.charCodeAt(box_id.length-1) + 1);
        }
        return retval;
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
