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
                    + '<input type="submit" value="Scan" id="submitscan"/></form></div>'
                + '<div id="orderdetaildiv"><ul id="orderdetails"/></div>'
                + '<form><input type="submit" id="submitorder" value="All Done"/></form>';

            activity.append(formhtml);
            $("input#ordernumber").focus();

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
                    thisli = $('<li id="' + item_ident
                               + '"><span class="count">1</span><span class="name">'
                               + item_name + '</span><span>' + item_ident + '</span>');
                    itemdetails.append(thisli);
                    inc_btn = $('<a href="#" class="increment"><img src="images/up_arrow_blue.png" alt="increment" width="16" height="16"></a>');
                    inc_btn.click( function(event) {
                        items_for_order[item_ident]++;
                        thisli.children('span.count').text(items_for_order[item_ident]);
                        return false;
                    });
                    dec_btn = $('<a href="#" class="decrement"><img src="images/down_arrow_blue.png" alt="decrement" width="16" height="16"></a>');
                    dec_btn.click(function (event) {
                        items_for_order[item_ident]--;
                        thisli.children('span.count').text(items_for_order[item_ident]);
                        return false;
                    });
                    rem_btn = $('<a href="#" class="remove"><img src="images/delete_x_red.png" alt="remove" width="16" height="16"></a>');
                    rem_btn.click(function (event) {
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
                    thisli.prepend(inc_btn, dec_btn, rem_btn);
                }

                if (typeof(item) != "object") {
                    thisli.addClass("unknown_item");
                    thisli.click( function(event) {
                        // bring up the add/edit item popup
                        var newitem = new Object;
                        newitem.barcode = item_ident;
                        itemform(newitem);
                        return false;
                    });
                }
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

                event.perventDefault();
            });

    }});
}
