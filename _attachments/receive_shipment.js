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

    exists_in_list = function(item, list) {
        for (var i in list) {
            if (list[i] == item) {
                return true;
            }
        }
        return false;
    };

    // functions
    var draw_receive_form, resolve_warehouse_select;

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
            var order_is_empty = (function(items_for_order) {
                                    return function() {
                                        for (var k in items_for_order) {
                                            return false;
                                        }
                                        return true;
                                    }})(items_for_order);

            var add_to_order = function(item) {
                var thisli;
                var item_ident = typeof(item) == "object" ? item.barcode : item;
                var item_name = typeof(item) == "object" ? item.name : '';
                if (item_ident in items_for_order) {
                    // Already in the order - bump up the count
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
                               + item_name + '</span><span class="barcode">' + item_ident + '</span>');

                    itemdetails.append(thisli);

                    thisli.find('a.increment').click( function(event) {
                        var thisli = $(event.target).parents("li.itemrow:first");
                        items_for_order[thisli.attr('id')]++;
                        thisli.children('span.count').text(items_for_order[thisli.attr('id')]);
                        return false;
                    });

                    thisli.find('a.decrement').click(function (event) {
                        var thisli = $(event.target).parents("li.itemrow:first");
                        items_for_order[thisli.attr('id')]--;
                        thisli.children('span.count').text(items_for_order[thisli.attr('id')]);
                        return false;
                    });

                    thisli.find('a.remove').click(function (event) {
                        var thisli = $(event.target).parents("li.itemrow:first");
                        var popup = new EditableForm({
                            title: 'Confirm Remove',
                            modal: 1,
                            class: 'warning',
                            fields: [ { type: 'label',
                                        label: 'Are you sure you want to remove '
                                                + (item_name ? item_name : item_ident)
                                                + ' from the order'} ],
                            buttons: [ { id: 'remove', label: 'Yes, remove it', action: 'submit' },
                                       { id: 'cancel', label: 'No, it\'s a mistake', action: 'remove'}],
                            submit: function(event) {
                                        delete items_for_order[thisli.attr('id')];
                                        thisli.remove();
                                        popup.remove();
                                    }
                        });

                        return false;
                    });
                }

                if (typeof(item) != "object") {
                    var update_li = (function(thisli) {
                            return function(newdoc) {
                                // Update the line to show the newly entered info
                                thisli.find(".name").text(newdoc.name);
                                thisli.find(".barcode").text(newdoc.barcode);
                                thisli.removeClass("unknown_item");
                                thisli.unbind('click');

                                // update the order record to track by the new item's barcode
                                var count = items_for_order[thisli.attr('id')];
                                delete items_for_order[thisli.attr('id')];
                                items_for_order[newdoc.barcode] = count;
                                thisli.attr('id') = newdoc.barcode;
                            };
                    })(thisli);

                    thisli.addClass("unknown_item");
                    thisli.click( function(event) {
                        var thisli = $(event.target).parents("li.itemrow:first");
                        // bring up the add/edit item popup
                        var newitem = {
                            barcode: item_ident,
                            name: '',
                            sku: '',
                            desc: '',
                        };
                        itemform(newitem, update_li);
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

            var mark_error = function (row, text) {
                var text_space = row.find('.errortext');
                row.addClass("problem");
                text_space.text(text);
                row.children('input').focus();
                return text_space;
            };

            var verify_unique_order_number = function(ordernumber,next_action) {
                db.view('couchinv/order-exists-by-order-number?key="' + ordernumber + '"',
                        { success: function(data) {
                            if (data.rows.length > 0) {
                                mark_error($("input#ordernumber").parents("tr"), "* Duplicate");
                                return false;
                            } else {
                                next_action();
                            }
                        }});
            };

            var validate_then_save_order = function(event) {
                // When the order is complete

                // clear previous errors
                $('.problem').removeClass('problem');
                $('.errortext').text('');
                
                var order_number = $("input#ordernumber").val();
                if ((order_number == undefined) || (order_number == '')) {
                    // uniqueness check happens a little later
                    mark_error($("input#ordernumber").parents("tr"), 'Required');
                }
                var customer_name = $("input#customername").val();
                if ((customer_name == undefined) || (customer_name == '')) {
                    mark_error($("input#customername").parents("tr"), 'Required');
                } else {
                    if (! exists_in_list(customer_name, customer_names)) {
                        var text_space = mark_error($("input#customername").parents("tr"), "* Need info");
                        text_space.click(function(event) {
                            var customer_name = $("input#customername").val();
                            var firstname, lastname;
                            var space_pos = customer_name.indexOf(' ');
                            if (space_pos == -1) {
                                firstname = customer_name;
                                lastname = '';
                            } else {
                                firstname = customer_name.substr(0,space_pos);
                                lastname = customer_name.substr(space_pos+1);
                            }
                            customerform({firstname: firstname, lastname: lastname},
                                        function(doc) { 
                                            // called when they're done putting the info in
                                            $("input#customername").parents("tr").removeClass('problem');
                                            // put this person on the list so we don't have to re-hit the DB
                                            customer_names.push(doc.firstname + ' ' + doc.lastname);
                                            customer_names.push(doc.lastname + ' ' + doc.firstname);
                                            validate_then_save_order(event) });
                        });
                    }
                }
                if (order_is_empty()) {
                    new EditableForm({
                            title: 'No Items',
                            modal: 1,
                            fields: [{type: 'label', label: 'Add some items to the order first'}],
                            buttons: [{ id: 'ok', label: 'Ok', action: 'remove'}]
                        });
                    $("#orderdetails").addClass('problem');
                }

                if ($('.unknown_item').length) {
                   new EditableForm({
                            title: 'Unknown Items',
                            modal: 1,
                            fields: [{type: 'label', label: 'Some items are not yet known to the system'}],
                            buttons: [{ id: 'ok', label: 'Ok', action: 'remove'}]
                        });
                    $("#orderdetails").addClass('problem');
                }

                var finish_saving_order = function () {
                    var warehouse_id = $("select#warehouseid").val();
    
                    var popup_success = function () {
                        var popup = new EditableForm({
                                title: 'Shipment Recorded',
                                modal: 1,
                                buttons: [ { id: 'ok', label: 'Ok', action: 'submit' } ],
                                submit: function(event) {
                                    popup.remove();
                                    // Back to the beginning.  This may be a memory leak!?
                                    receive_shipment_form();
                                }
                            });
                    };
    
                    var update_inventory = function (warehouse, items_for_order) {
                        if (! warehouse.inventory) {
                            warehouse.inventory = {};
                        }
                        for (var barcode in items_for_order) {
                            if (!warehouse.inventory[barcode]) {
                                warehouse.inventory[barcode] = items_for_order[barcode];
                            } else {
                                warehouse.inventory[barcode] += items_for_order[barcode];
                            }
                        }
    
                        var receipt = new Object();
                        receipt.type = 'receive';
                        receipt.ordernumber = $("input#ordernumber").val();
                        receipt.warehouseid = warehouse_id;
                        receipt.customerid = $("input#customerid").val();
                        receipt.customername = $("input#customername").val();
                        receipt.date = $("input#date").val();
                        receipt.items = items_for_order;
                        // save the updated warehouse and order receipt
                        db.bulkSave({all_or_nothing:true, docs: [warehouse, receipt]},
                             {  success: popup_success  });
                    };
    
                    // We'll need the warehouse document
                    db.openDoc( warehouse_id,
                                { success: (function(items_for_order) {
                                        return function(doc) {
                                            update_inventory(doc, items_for_order);
                                         }})(items_for_order)
                                });
                    return false;
                };

                var order_number = $("input#ordernumber").val();
                if (order_number) {
                    // if there are already problems detected, then call verify_unique_order_number
                    // only so it can highlite that row with a duplicate error
                    // If there are no problems so far, then it can go ahead and finish saving if
                    // the uniqueness check succeeds
                    var next_action = ($('.problem').length || $('.unknown_item').length)
                                        ? function() { return false }
                                        : finish_saving_order;
                    verify_unique_order_number(order_number, next_action);
                }
                return false;
            };
            $("input#submitorder").click(validate_then_save_order);

    };
}
