var warehouse_list_headers = [ { name: 'Name',
                                 value: function(row) { return row.key },
                                 cssclass: 'name' },
                               { name: 'Items',
                                 value: function(row) { return row.value.unique_items } },
                               { name: 'Inventory',
                                 value: function(row) { return row.value.total_items } }
                        ];


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
    $("a.add").bind('click', function(event) {
        warehouseform();
        return false;
    });

    $("#submitsearch").click( function(event) {
        var query = $("input#searchquery").val().toLowerCase();
        db.view('couchinv/warehouse-summary-byname?startkey="' + query + '"&endkey="'
                                                               + query + '\u9999"' ,
            { success: function(data) {
                draw_item_list( {   list: $("#warehouselist"),
                                    detail: $("warehousedetail"),
                                    editor: customerform,
                                    removerid: function(doc) { return doc.name; },
                                    headers: warehouse_list_headers
                              }, data.rows);
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
           draw_item_list({ list: $("#warehouselist"),
                            detail: $("#warehousedetail"),
                            editor: warehouseform,
                            removerid: function(doc) { return doc.name },
                            headers: warehouse_list_headers
                        }, data.rows);
        }
    });
}


function warehouseform(doctoedit) {
    var formhtml = '<h1>' + (doctoedit ? 'Edit' : 'Add') + ' Warehouse</h1>';
    formhtml = formhtml + '<form name="updatewarehouse" id="updatewarehouse" action="">';

    if (doctoedit) {
	// Editing an existing customer
	formhtml = formhtml 
                   + '<input name="docid" id="docid" type="hidden" value="' + doctoedit._id + '"/>';
    }

    formhtml = formhtml + '<table>'
	+ '<tr><td>Name</td>'
	+ '<td><input name="name" type="text" id="name" value="'
	    + (doctoedit ? doctoedit.name : '')
	    + '"/></td></tr>'

	+ '<tr><td>Address</td>'
	+ '<td><textarea name="address" id="address" rows="4" cols="40">'
	    + (doctoedit ? doctoedit.address : '')
	    + '</textarea></td></tr>'
	
	+ '<tr><td>Phone</td>'
	+ '<td><input name="phonenumber" type="text" id="phonenumber" value="'
	    + (doctoedit ? doctoedit.phonenumber : '')
	    + '"/></td></tr>'

	+ '<tr><td>Notes</td>'
	+ '<td><textarea name="notes" id="notes" rows="4" cols="40">'
	    + (doctoedit ? doctoedit.notes : '')
	    + '</textarea></td></tr>'
	+ '</table><input type="submit" name="submit" class="update" value="'
	+ (doctoedit ? 'Update' : 'Add') + '"/>'
	+ '<input type="submit" name="submit" class="cancel" value="Cancel"/></form>';

    var dialog = popup_dialog(formhtml);
    var form = dialog.children("form#updatewarehouse");
    form.children("input.update").click( function(event) {
        db.saveDoc(build_warehouse_doc_from_form(doctoedit, form),
            { success: function() {
                popup_cleanup(dialog);
                initial_warehouse_list();
             }});
        return false;
    });

    form.children('input.cancel').click( function(event) {
        popup_cleanup(dialog);
        return false;
    });
    form.find("input#name").focus();
}

function build_warehouse_doc_from_form(doc,form) {
    if (!doc) {
	doc = new Object;
    }
    var fields = ['name','address','phonenumber','notes'];
    for (var i in fields) {
        var fieldname = fields[i];
        var formvalue = form.find("#" + fieldname).val();
        if (formvalue == undefined) {
            formvalue = '';
        }
        doc[fieldname] = formvalue;
    }
    doc.type	    = 'warehouse';

    return doc;
}
