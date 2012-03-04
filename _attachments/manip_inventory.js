var item_list_headers = [ { name: 'Name',
                            value: function(row) { return row.value.name; },
                            cssclass: 'name' },
                          { name: 'SKU',
                            value: function(row) { return row.value.sku; }},
                          { name: 'Barcode',
                            value: function(row) { return row.value.barcode; }},
                       ];

function build_item_activity() {
    var activity = $("#activity");
    activity.empty();

    activity.append('<h1>Inventory Items</h1>'
                    + '<div id="inventory">'
                        + '<div><a href="#" class="add">Add Inventory Item</a>'
                            + '<span class="search"><form action=""><input type="text" id="searchquery"/>'
                            + '<input type="submit" value="Search" id="submitsearch"/>'
                            + '<input type="submit" value="Reset" id="resetsearch"/></form></span></div>'
                        + '<div id="itemslist"></div>'
                        + '<div id="itemdetail"></div>'
                    + '</div>');

    $("a.add").bind('click', function(event) {
        itemform();
        return false;
    });

    $("#submitsearch").click(function(event) {
        // I guess couchDB can't really do a SQL-like query
        // we'll have to handle it in here :(
        var query = $("input#searchquery").val().toLowerCase();
        db.view("couchinv/item-docs-by-name", {
            success: function(data) {
                var matching = $.grep(data.rows, function(doc,idx) {
                    var value = doc.value;
                    return (value.name && (value.name.toString().toLowerCase().indexOf(query) > -1))
                           || (value.sku && (value.sku.toString().toLowerCase().indexOf(query) > -1))
                           || (value.barcode && (value.barcode.toString().toLowerCase().indexOf(query) > -1))
                           || (value.desc && (value.desc.toString().toLowerCase().indexOf(query) > -1));
                });
                draw_item_list({ list: $("#itemslist"),
                                 detail: $("#itemdetail"),
                                 editor: itemform,
                                 removerid: function(doc) { return 'item ' + doc.name; },
                                 headers: item_list_headers
                               },matching);
            }
        });
        return false;
    });

    $("#resetsearch").click(function(event) {
        $("input#searchquery").val('');
        initial_inventory_list();
        return false;
    });

    initial_inventory_list();
}


function initial_inventory_list() {
    db.view("couchinv/item-docs-by-name", {
        success: function(data) {
            draw_item_list({ list: $("#itemslist"),
                             detail: $("#itemdetail"),
                             editor: itemform,
                             removerid: function(doc) { return 'item ' + doc.name; },
                             headers: item_list_headers
                            }, data.rows);
        }
    });
}

function itemform(doctoedit) {
    var formdiv = $('<div><h1>' + (doctoedit ? 'Edit' : 'Add') + ' Item</h1></div>');
    var form = $('<form name="updateitem" id="updateitem" action=""/>');
    formdiv.append(form);

    if (doctoedit) {
        // editing an existing item
        form.append('<input name="docid" id="docid" type="hidden" value="' + doctoedit._id + '"/>');
    }

    var formtable = $('<table class="form"/>');
    form.append(formtable);

    var name_row = $('<tr><td class="prompt">Name</td>'
                    + '<td><input name="name" type="text" id="name" value="'
                    + (doctoedit ? doctoedit.name : '')
                    + '"/><span class="errortext"/></td></tr>');

    var sku_row = $('<tr><td class="prompt">SKU</td>'
                    + '<td><input name="sku" type="text" id="sku" value="'
                    + (doctoedit ? doctoedit.sku : '')
                    + '"/><span class="errortext"/></td></tr>');

    var barcode_row = $('<tr><td class="prompt">Barcode</td>'
                    + '<td><input name="barcode" type="text" id="barcode" value="'
                    + (doctoedit ? doctoedit.barcode : '' )
                    + '"/><span class="errortext"/></td></tr>');

    var desc_row = $('<tr><td class="prompt">Description</td>'
                    + '<td><textarea name="desc" rows="5" cols="40" id="desc">'
                    + (doctoedit ? doctoedit.desc : '' )
                    + '</textarea></td></tr>');

    formtable.append(name_row, sku_row, barcode_row, desc_row);

    form.append('<input type="submit" name="submit" class="update" value="'
                + (doctoedit ? 'Update' : 'Add') + '"/>'
                + '<input type="submit" name="submit" class="cancel" value="Cancel"/>');

    var form_popup = popup_dialog(formdiv);

    var mark_error = function (row,text) {
            var text_space = row.find('.errortext');
            row.addClass("problem");
            text_space.text(text);
            row.children('input').focus();
    };

    form.children("input.update").bind('click',
        function(event) {
            var doctosave = build_item_doc_from_form(doctoedit,form);

            form_popup.find(".problem").removeClass("problem");  // remove all previous problems
            $('.errortext').text('');

            var num_problems = 0;
            if (! doctosave.barcode) {
                mark_error(barcode_row, 'Barcode required');
                num_problems++;
            }
            if (! doctosave.sku) {
                mark_error(sku_row, 'SKU required');
                num_problems++;
            }
            if (! doctosave.name) {
                mark_error(name_row, 'Name required');
                num_problems++;
            }
            if (num_problems) {
                return false;
            }
    
            // Verify that this newly added item has a unique sku and barcode
            var query = '["' + doctosave.barcode + '","' + doctosave.sku + '"]';
            db.view('couchinv/item-exists-by-sku-or-barcode?keys=' + query,
                { success: function (data) {
                    // Look through the IDs of the matching rows.  If all of them match
                    // the ID of this document we're saving, then it's only returning rows
                    // from this doc, and it's OK to save over it
                    var conflicts = $.grep(data.rows, function (row, idx) {
                            return (row['id'] != doctosave['_id'])   // Can't conflict with ourselves
                    });

                    if (conflicts.length) {
                        // There was a dupe

                        var matching_fields = {};
                        $.each(conflicts, function(idx,row) {
                            matching_fields[row.value] = 1;  // row.value is 'sku' or 'barcode'
                        });
                        if (matching_fields.barcode) {
                            mark_error(barcode_row, '* Duplicate');
                        }
                        if (matching_fields.sku) {
                            mark_error(sku_row, '* Duplicate');
                        }
                    } else {
                        // no dupes
                        db.saveDoc(build_item_doc_from_form(doctoedit,form),
                            { success: function() {
                                popup_cleanup(form_popup);
                                initial_inventory_list();
                             }} );
                    }
                    return false;
                }}
            );
            return false;
        }
    );

    form.children('input.cancel').bind('click',
        function(event) {
            popup_cleanup(form_popup);
            return false;
        }
    );

    form.find("input#name").focus();

}

function build_item_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    doc.name    = form.find("#name").val();
    doc.sku     = form.find("#sku").val();
    doc.barcode = form.find("#barcode").val();
    doc.desc    = form.find("#desc").val();
    doc.type    = 'item';

    return(doc);
}


