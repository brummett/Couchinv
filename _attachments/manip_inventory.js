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
        db.view("couchinv/items-byname", {
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
    db.view("couchinv/items-byname", {
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
    var formhtml = '<h1>' + (doctoedit ? 'Edit' : 'Add') + ' Item</h1>';
    formhtml = formhtml + '<form name="updateitem" id="updateitem" action="">';

    if (doctoedit) {
        // editing an existing item
        formhtml = formhtml +
            '<input name="docid" id="docid" type="hidden" value="' + doctoedit._id + '"/>';
    }

    formhtml = formhtml + '<table>'
        + '<tr><td class="prompt">Name</td>'
        + '<td><input name="name" type="text" id="name" value="'
            + (doctoedit ? doctoedit.name : '')
            + '"/></td></tr>'

        + '<tr><td class="prompt">SKU</td>'
        + '<td><input name="sku" type="text" id="sku" value="'
            + (doctoedit ? doctoedit.sku : '')
            + '"/></td></tr>'

        + '<tr><td class="prompt">Barcode</td>'
        + '<td><input name="barcode" type="text" id="barcode" value="'
            + (doctoedit ? doctoedit.barcode : '' )
            + '"/></td></tr>'

        + '<tr><td class="prompt">Description</td>'
        + '<td><textarea name="desc" rows="5" cols="40" id="desc">'
            + (doctoedit ? doctoedit.desc : '' )
            + '</textarea></td></tr>'

        + '<tr><td class="prompt">Count</td>'
        + '<td><input name="count" type="text" id="count" value="'
            + (doctoedit ? doctoedit.count : '0')
            + '"/></td></tr>';

    formhtml = formhtml + 
        '</table>'
        + '<input type="submit" name="submit" class="update" value="'
        + (doctoedit ? 'Update' : 'Add') + '"/>'
        + '<input type="submit" name="submit" class="cancel" value="Cancel"/></form>';

    var itemform = popup_dialog(formhtml);
    var form =  itemform.children("form#updateitem");
    form.children("input.update").bind('click',
        function(event) {
            var doctosave = build_item_doc_from_form(doctoedit,form);
    
            // Verify that this newly added item has a unique sku and barcode
            var query = '["' + doctosave.barcode + '","' + doctosave.sku + '"]';
            db.view('couchinv/item-exists-by-sku-or-barcode?keys=' + query,
                { success: function (data) {
                    // Look through the IDs of the matching rows.  If all of them match
                    // the ID of this document we're saving, then it's only returning rows
                    // from this doc, and it's OK to save over it
                    var is_conflict = 0;
                    $.each(data.rows, function(row,idx) {
                        if (row['id'] != doctosave['id']) {
                            is_safe = 1;
                        }
                    });
                    if (is_conflict) {
                        // There was a dupe
                        itemform.find(".prompt").parent().removeClass("problem");  // remove all previous problems
                        var matching_fields = {};
                        $.each(data.rows, function(row,idx) {
                            matching_fields[row.value] = 1;  // row.value is 'sku' or 'barcode'
                        });
                        if (matching_fields.barcode) {
                            var barcode_input = $("input#barcode");
                            barcode_input.parents("tr").addClass("problem");
                            barcode_input.focus();
                        }
                        if (matching_fields.sku) {
                            var sku_input = $("input#sku");
                            sku_input.parents("tr").addClass("problem");
                            sku_input.focus();
                        }
                    } else {
                        // no dupes
                        db.saveDoc(build_item_doc_from_form(doctoedit,form),
                            { success: function() {
                                popup_cleanup(itemform);
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
            popup_cleanup(itemform);
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


