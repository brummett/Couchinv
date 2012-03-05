var db = $.couch.db("couchinv");

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
    var simple_validate = function(formobj, input_id, input) {
            if ((input.val() == undefined) || (input.val() == '')) {
                return [0, '* Required'];
            } else {
                return [1];
            }
        };
    var fields = [ { type: 'text',
                     label: 'Name',
                     id: 'name',
                     value: (doctoedit ? doctoedit.name : ''),
                     validate: simple_validate
                   },
                   { type: 'text',
                     label: 'SKU',
                     id: 'sku',
                     value: (doctoedit ? doctoedit.sku : ''),
                     validate: simple_validate
                   },
                   { type: 'text',
                     label: 'Barcode',
                     id: 'barcode',
                     value: (doctoedit ? doctoedit.barcode : ''),
                     validate: simple_validate
                   },
                   { type: 'textarea',
                     label: 'Description',
                     id: 'desc',
                     rows: 5,
                     cols: 40,
                     value: (doctoedit ? doctoedit.desc : '')
                   } ];
    if (doctoedit) {
        fields.push({   type: 'hidden',
                        id: '_id',
                        value: doctoedit['_id']});
    }

    var form = new EditableForm({
                    title: (doctoedit ? 'Edit' : 'Add') + ' Item',
                    modal: 1,
                    fields: fields,
                    buttons: [{ id: 'update',
                                label: (doctoedit ? 'Update' : 'Add'),
                                action: 'submit'
                              },
                              { id: 'cancel',
                                label: 'Cancel',
                                action: 'remove'
                              }]
                });

    form.submit = function(event) {
        // Make sure the barcode and sku are unique
        // 'this' here is the form object, since we're called from it's validate_inputs_then_submit()
        var theform = this;
        var query = '["' + theform.valueFor('barcode') + '","' + theform.valueFor('sku') + '"]';
        
        db.view('couchinv/item-exists-by-sku-or-barcode?keys=' + query,
            { success: function(data) {
                var doctosave = build_item_doc_from_form(doctoedit,form);
                var conflicting = {};
                for (i in data.rows) {
                    if (data.rows[i].id == doctosave['_id']) {
                        continue;  // Can't conflict with ourselves
                    }
                    var conflicting_field = data.rows[i].value;
                    var conflicting_value = data.rows[i].key;
                    if (doctosave[conflicting_field] == conflicting_value) {
                        // yes, it conflicts
                        if (! conflicting[ conflicting_field ]++) {
                            theform.markError(conflicting_field, '* Duplicate');
                        }
                    }
                }
                if ($.isEmptyObject(conflicting)) {
                    // They're all unique.  Save the thing!
                    db.saveDoc(doctosave,
                        { success: function() {
                            //popup_cleanup(form_popup);
                            form.remove();
                            initial_inventory_list();
                        }});
                }
            }
        });
        return false;
    };
}

function build_item_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    doc.name    = form.valueFor('name');
    doc.sku     = form.valueFor("sku");
    doc.barcode = form.valueFor("barcode");
    doc.desc    = form.valueFor("desc");
    doc.type    = 'item';

    return(doc);
}

