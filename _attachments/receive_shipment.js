function build_receive_activity() {
    var activity = $("#activity");
    activity.empty();

    receive_shipment_form();
}

function autocomplete_couchdb_adapter(elt) {
//    elt.getSuggestions = function
}


function receive_shipment_form (doctoedit) {
    var activity = $("#activity");
    activity.empty();

    // functions
    var draw_receive_form, resolve_warehouse_select, get_customer_names;

    db.view("couchinv/customer-exists-by-any-name", { success: function(data) {
        var customer_names = [];
        var customer_ids = [];
        $.each(data.rows, function(idx, row) {
            customer_names.push(row['key']);
            customer_ids.push(row['id']);
        });
       resolve_warehouse_select(customer_names, customer_ids);
    }});
            
    resolve_warehouse_select = function (customer_names, customer_ids) {
        db.view("couchinv/warehouse-summary-byname",
            { success: function(warehouse_data) {

                var warehouse_select = '<select id="warehouseid">';
                $.each(warehouse_data.rows, function(idx,row) {
                    warehouse_select = warehouse_select + '<option value="' + row['id'] + '"';
                    if (doctoedit && doctoedit.warehouseid == row['id']) {
                        warehouse_select = warehouse_select + ' selected="selected"';
                    }
                    warehouse_select = warehouse_select + '>' + row['key'] + '</option>';
                });
                warehouse_select = warehouse_select + '</select>';
                draw_receive_form(customer_names, customer_ids, warehouse_select);
            }
        });
    };

    draw_receive_form = function(customer_names, customer_ids, warehouse_select) {
            var now = new Date();
            var datestr = now.getFullYear() + '-'
                       + (now.getMonth() < 10 ? '0' : '') + now.getMonth() + '-'
                       + (now.getDate() < 10 ? '0' : '') + now.getDate();

            var formhtml = '<h1>' + (doctoedit ? 'Edit Received' : 'Receive') + ' Shipment</h1>'
                + '<div id="orderdata"><table class="form"><tr><td>Date</td>'
                + '<td><input name="date" id="date" type="text" value="'
                    + (doctoedit ? doctoedit.date : datestr)
                    + '"/></td></tr>'

                + '<tr><td>Order number</td>'
                + '<td><input name="ordernumber" id="ordernumber" type="text" value="'
                    + (doctoedit ? doctoedit.ordernumber : '')
                    + '"/><span class="errortext"/></td></tr>'

                + '<tr><td>Shipped From</td>'
                + '<td><input type="text" id="customername" value="'
                    + (doctoedit ? doctoedit.customername : '')
                    + '"/><span class="errortext"/></td></tr>'

                + '<tr><td>Received to</td><td>' + warehouse_select + '</td></tr>'

                + '</table></div>'

                + '<input type="hidden" id="customerid" value="' + (doctoedit ? doctoedit.customerid : '' ) + '"/>'

                + '<div id="scanitems"><form id="scanitems"><input type="text" id="itemscan"/>'
                    + '<input type="submit" value="Scan" id="submitscan"/></form></div>'
                + '<div id="orderdetaildiv"><ul id="orderdetails" class="itemlist">'
                    + '<lh class="itemrow"><span/><span>Count</span><span>Name</span><span/></lh></ul></div>'
                + '<form><input type="submit" id="submitorder" value="All Done"/></form>';

            activity.append(formhtml);
            $("input#ordernumber").focus();

            $("input#customername").autocomplete({ lookup: customer_names,
                                  data: customer_ids,
                                  onSelect: function(name,customer_id) { $("input#customerid").val(customer_id) } });

            var itemscan = $("input#itemscan");
            var itemdetails = $("ul#orderdetails");

            var items_for_order = {};  // keys are barcodes, values are how many
            var add_to_order = function(item) {
                var thisli;
                var item_ident = typeof(item) == "object" ? item.barcode : item;
                var item_name = typeof(item) == "object" ? item.name : '';
                if (item_ident in items_for_order) {
                    items_for_order[item_ident]++;
                    thisli = itemdetails.find("#" + item_ident);
                    thisli.children('span.count').text(items_for_order[item_ident]);
                } else {
                    items_for_order[item_ident] = 1;
                    thisli = $('<li class="itemrow" id="' + item_ident + '"><span class="buttons">'
                        + '<a href="#" class="increment"><img src="images/up_arrow_blue.png" alt="increment"></a>'
                        + '<a href="#" class="decrement"><img src="images/down_arrow_blue.png" alt="decrement"></a>'
                        + '<a href="#" class="remove"><img src="images/delete_x_red.png" alt="remove"></a>'
                        + '</span><span class="count">1</span><span class="name">'
                               + item_name + '</span><span>' + item_ident + '</span>');

                    itemdetails.append(thisli);

                    thisli.find('a.increment').click( function(event) {
                        items_for_order[item_ident]++;
                        thisli.children('span.count').text(items_for_order[item_ident]);
                        return false;
                    });

                    thisli.find('a.decrement').click(function (event) {
                        items_for_order[item_ident]--;
                        thisli.children('span.count').text(items_for_order[item_ident]);
                        return false;
                    });

                    thisli.find('a.remove').click(function (event) {
                        var popuphtml = '<h1>Confirm Remove</h1><p>Are you sure you want to delete '
                                + (item_name ? item_name : item_ident) + ' from the order?</p>'
                                +  '<input type="submit" name="submit" id="Remove" value="Yes, remove it"/>'
                                + '<input type="submit" name="submit" id="Cancel" value="No, it\'s a mistake"/>';
                        var popup = popup_dialog(popuphtml);
                        popup.addClass('warning');
                        $("input#Remove", popup).click( function(event) {
                            delete items_for_order[item_ident];
                            thisli.remove();
                            popup_cleanup(popup);
                            return false;
                        });
                        $("input#Cancel", popup).click( function(event) {
                            popup_cleanup(popup);
                            return false;
                        });

                        return false;
                    });
                }

                if (typeof(item) != "object") {
                    thisli.addClass("unknown_item");
                    thisli.click( function(event) {
                        // bring up the add/edit item popup
                        var newitem = {
                            barcode: item_ident,
                            name: '',
                            sku: '',
                            desc: '',
                        };
                        itemform(newitem);
                        return false;
                    });
                }

                itemscan.val('');
                itemscan.focus();
            };
                    
            $("form#scanitems").submit(function(event) {
                // When an item is submitted to the Scan
                var val = itemscan.val();
                db.view('couchinv/items-by-barcode?key="' + val + '"',
                    { success: function(data) {
                        if (data.rows.length) {
                            // Found it by barcode
                            add_to_order(data.rows[0].value);
                        } else {
                            db.view('couchinv/items-by-sku?key="' + val + '"',
                                { success: function(data) {
                                    if (data.rows.length) {
                                        // found it by sku
                                        add_to_order(data.rows[0].value);
                                    } else {
                                        // unknown item
                                        add_to_order(val);
                                    }
                                }
                            });
                        }
                    }
                });

                event.preventDefault();
            });

            $("input#submitorder").click( function(event) {
                // When the order is complete

                var mark_error = function (row, text) {
                    var text_space = row.find('.errortext');
                    row.addClass("problem");
                    text_space.text(text);
                    row.children('input').focus();
                };

                var num_problems = 0;
                var order_number = $("input#ordernumber").val();
                if ((order_number == undefined) || (order_number == '')) {
                    mark_error($("input#ordernumber").parents("tr"), 'Required');
                    num_problems++;
                }
                var customer_name = $("input#customername").val();
                if ((customer_name == undefined) || (customer_name == '')) {
                    mark_error($("input#ordernumber").parents("tr"), 'Required');
                    num_problems++;
                }
                if (num_problems) {
                    return false;
                }

                var warehouse_id = $("select#warehouseid").val();

                var popup_success = function () {
                    var popup = popup_dialog('<h1>Shipment Recorded</h1><input id="ok" type="submit" value="Ok"/>');
                    $(popup).find('input#ok').click( function (event) {
                        event.preventDefault();
                        popup_cleanup(popup);
                        receive_shipment_form();  // Back to the beginning.  This may be a memory leak!?
                    });
                };

                var update_inventory = function (warehouse) {
                    for (barcode in items_for_order) {
                        warehouse.inventory[barcode] += items_for_order[barcode];
                    }

                    var receipt = new Object();
                    receipt.type = 'receive';
                    receipt.ordernumber = $("input#ordernumber").val();
                    receipt.warehouseid = warehouse_id;
                    receipt.customerid = $("input#customerid").val();
                    receipt.customername = $("input#customername").val();
                    receipt.date = $("input#date").val();
                    receipt.items = items_for_order;
                    db.saveDoc(receipt, { success: popup_success });
                };

                // We'll need the warehouse document
                db.openDoc( warehouse_id, { success: update_inventory });
                event.perventDefault();
            });

    };
}
