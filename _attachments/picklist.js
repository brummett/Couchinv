// Generate a page with the unshipped orders in the order they should
// be filled

function build_picklist_activity() {
    var activity = $('div#activity');
    activity.empty();

    show_picklist_order_count_by_warehouse(
        function(warehouse_doc) {
            db.view('couchinv/unshipped-order-docs-by-warehouseid-and-priority'
                    + '?reduce=false&start_key=["' + warehouse_doc._id + '"]',
                { success: function(unshipped_order_data) {
                        generate_picklist_for_warehouse(warehouse_doc, unshipped_order_data);
                }});
        }
    ).appendTo(activity);

    function generate_picklist_for_warehouse(warehouse_doc, unshipped_order_data) {
        activity.empty();
        if (! unshipped_order_data.rows.length) {
            activity.append('<p>No outstanding orders for that warehouse</p>');
            return false;
        }

        // make a copy of the available items in this warehouse
        var available = copy_warehouse_items(warehouse_doc.inventory);

        var fillable_orders = [];   // orders we can fill completely
        var short_orders = [];      // orders we don't have everything for

        // for each order, already sorted by priority
        for (var i in unshipped_order_data.rows) {
            var this_order = unshipped_order_data.rows[i].value;

            var short_items = warehouse_items_short_for_order(available, this_order.items);

            if (short_items.length() == 0) {
                // adjust the available for each item in this order
                warehouse_commit_order_items(available, this_order.items);
                fillable_orders.push(this_order);
            } else {
                this_order.short_items = short_items;
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
                db.saveDoc(order);  // Save the Box ID

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
                        + ((order.short_items && order.short_items[barcode]) ? (', short ' + order.short_items[barcode]) : '' )
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
