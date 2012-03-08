var warehouse_item_list;

function build_warehouse_activity() {
    var activity = $("#activity");
    activity.empty();

    activity.append('<h1>Warehouses</h1>'
                    + '<div id="warehouses">'
                    + '<div><a href="#" class="add">Add Warehouse</a>'
			+ '<span class="search"><form action=""><input type"text" id="searchquery"/>'
                        + '<input type="submit" value="Search" id="submitsearch">'
                        + '<input type="submit" value="Reset" id="resetsearch"></form></span></div>'
                    + '<div id="warehouselist"/><div id="warehousedetail"/>'
                    + '</div>');

    warehouse_item_list = new ItemLister({
                                    listContainer: $("#warehouselist"),
                                    detailContainer: $("#warehousedetail"),
                                    editor: warehouseform,
                                    removerid: function(doc) { return doc.name; },
                                    headers: [ { name: 'Name',
                                                 value: function(row) { return row.key },
                                                 cssclass: 'name' },
                                               { name: 'Items',
                                                 value: function(row) { return row.value.unique_items } },
                                               { name: 'Inventory',
                                                 value: function(row) { return row.value.total_items } }
                                        ]
                                })
    $("a.add").bind('click', function(event) {
        warehouseform();
        return false;
    });

    $("#submitsearch").click( function(event) {
        var query = $("input#searchquery").val().toLowerCase();
        db.view('couchinv/warehouse-summary-byname?startkey="' + query + '"&endkey="'
                                                               + query + '\u9999"' ,
            { success: function(data) {
                warehouse_item_list.draw(data.rows);
        }});
        return false;
    });

    $("#resetsearch").click( function(event) {
        $("input#searchquery").val('');
        initial_warehouse_list();
        return false;
    });

    initial_warehouse_list();
}

function initial_warehouse_list() {
    db.view("couchinv/warehouse-summary-byname", {
        success: function(data) {
           warehouse_item_list.draw(data.rows);
        }
    });
}


function warehouseform(doctoedit) {
    var fields = [{ type: 'text', id: 'name', label: 'Name',
                    value: (doctoedit ? doctoedit.name : ''), validate: 'notblank'},
                  { type: 'textarea', id: 'address', label: 'Address', rows: 4, cols: 40,
                    value: (doctoedit ? doctoedit.address : '') },
                  { type: 'text', id: 'phone', label: 'Phone',
                    value: (doctoedit ? doctoedit.phone : '') },
                  { type: 'textarea', id: 'notes', label: 'Notes', rows: 4, cols: 40,
                    value: (doctoedit ? doctoedit.notes : '') }
                ];
    if (doctoedit) {
        fields.push({type: 'hidden', value: doctoedit._id, id: '_id'});
    }
    var form = new EditableForm({
                        title: (doctoedit ? 'Edit' : 'Add') + ' Warehouse',
                        fields: fields,
                        modal: 1,
                        buttons: [{ id: 'update',
                                    label: (doctoedit ? 'Update' : 'Add'),
                                    action: 'submit' },
                                  { id: 'cancel',
                                    label: 'Cancel',
                                    action: 'remove' }
                                ],
                        submit: function(event) {
                                    var theform = this;
                                    db.saveDoc(build_warehouse_doc_from_form(doctoedit, form),
                                        { success: function() {
                                            theform.remove()
                                            initial_warehouse_list();
                                        }}
                                    );
                                    return false;
                                }
                    });
}

function build_warehouse_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    var fields = ['name','address','phonenumber','notes'];
    for (var i in fields) {
        var fieldname = fields[i];
        var formvalue = form.valueFor(fieldname);
        if (formvalue == undefined) {
            formvalue = '';
        }
        doc[fieldname] = formvalue;
    }
    doc.type	    = 'warehouse';

    return doc;
}
