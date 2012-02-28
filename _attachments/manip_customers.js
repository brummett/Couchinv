var customer_list_headers = [ { name: 'Name',
                            value: function(doc) {
                                       return doc.lastname + ', ' + doc.firstname;
                                    },
                            cssclass: 'name' },
                          { name: 'Email',
                            value: function(doc) { return doc.email; },
                            cssclass: 'email' },
                          { name: 'Phone',
                            value: function(doc) { return doc.phonenumber; },
                            cssclass: 'phone' },
                        ];


function build_customer_activity() {
    var activity = $("#activity");
    activity.empty();

    activity.append('<h1>Customers</h1>'
                    + '<div id="customers">'
                    + '<div><a href="#" class="add">Add Customer</a>'
			+ '<span class="search"><form action=""><input type"text" id="searchquery"/>'
                        + '<input type="submit" value="Search" id="submitsearch">'
                        + '<input type="submit" value="Reset" id="resetsearch"></form></span></div>'
                    + '<div id="customerlist"/><div id="customerdetail"/>'
                    + '</div>');
    $("a.add").bind('click', function(event) {
        customerform();
        return false;
    });

    $("#submitsearch").click( function(event) {
        var query = $("input#searchquery").val().toLowerCase();
        db.view('couchinv/customers-by_any_name?startkey="' + query + '"&endkey="'
                                                       + query + '\u9999"' ,
            { success: function(data) {
                draw_item_list( {   list: $("#customerlist"),
                                    detail: $("customerdetail"),
                                    editor: customerform,
                                    removerid: function(doc) {
                                          return 'customer ' + doc.firstname + ' ' + doc.lastname;
                                       },
                                    headers: customer_list_headers
                              }, data.rows);
        }});
        return false;
    });

    $("#resetsearch").click( function(event) {
        $("input#searchquery").val('');
        initial_customer_list();
        return false;
    });

    initial_customer_list();
}

function initial_customer_list() {
    db.view("couchinv/customers-by_any_name", {
        success: function(data) {
           draw_item_list({ list: $("#customerlist"),
                            detail: $("#customerdetail"),
                            editor: customerform,
                            removerid: function(doc) {
                                          return 'customer ' + doc.firstname + ' ' + doc.lastname;
                                       },
                            headers: customer_list_headers
                        }, data.rows);
        }
    });
}


function customerform(doctoedit) {
    var formhtml = '<h1>' + (doctoedit ? 'Edit' : 'Add') + ' Customer</h1>';
    formhtml = formhtml + '<form name="updatecustomer" id="updatecustomer" action="">';

    if (doctoedit) {
	// Editing an existing customer
	formhtml = formhtml 
                   + '<input name="docid" id="docid" type="hidden" value="' + doctoedit._id + '"/>';
    }

    formhtml = formhtml + '<table>'
	+ '<tr><td>First name</td>'
	+ '<td><input name="firstname" type="text" id="firstname" value="'
	    + (doctoedit ? doctoedit.firstname : '')
	    + '"/></td></tr>'

	+ '<tr><td>Last name</td>'
	+ '<td><input name="lastname" type="text" id="lastname" value="'
	    + (doctoedit ? doctoedit.lastname : '')
	    + '"/></td></tr>'

	+ '<tr><td>Address</td>'
	+ '<td><textarea name="address" id="address" rows="4" cols="40">'
	    + (doctoedit ? doctoedit.address : '')
	    + '</textarea></td></tr>'
	
	+ '<tr><td>Phone number</td>'
	+ '<td><input name="phonenumber" type="text" id="phonenumber" value="'
	    + (doctoedit ? doctoedit.phonenumber : '')
	    + '"/></td></tr>'


	+ '<tr><td>Email</td>'
	+ '<td><input name="email" type="text" id="email" value="'
	    + (doctoedit ? doctoedit.email : '')
	    + '"/></td></tr>'

	+ '<tr><td>Notes</td>'
	+ '<td><textarea name="notes" id="notes" rows="4" cols="40">'
	    + (doctoedit ? doctoedit.notes : '')
	    + '</textarea></td></tr>'
	+ '</table><input type="submit" name="submit" class="update" value="'
	+ (doctoedit ? 'Update' : 'Add') + '"/>'
	+ '<input type="submit" name="submit" class="cancel" value="Cancel"/></form>';

    var dialog = popup_dialog(formhtml);
    var form = dialog.children("form#updatecustomer");
    form.children("input.update").click( function(event) {
	db.saveDoc(build_customer_doc_from_form(doctoedit, form),
		{ success: function() {
			popup_cleanup(dialog);
			initial_customer_list();
	    }});
	return false;
    });

    form.children('input.cancel').click( function(event) {
	popup_cleanup(dialog);
	return false;
    });
}

function build_customer_doc_from_form(doc,form) {
    if (!doc) {
	doc = new Object;
    }
    var fields = ['firstname','lastname','address','phonenumber','email','notes'];
    for (var i in fields) {
        var fieldname = fields[i];
        var formvalue = form.find("input#" + fieldname).val();
        if (formvalue == undefined) {
            formvalue = '';
        }
        doc[fieldname] = formvalue;
    }
    doc.type	    = 'customer';

    return doc;
}
