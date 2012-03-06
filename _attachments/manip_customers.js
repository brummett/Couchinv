var customer_item_list;


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

    customer_item_list = new ItemLister({listContainer: $("#customerlist"),
                                    detailContainer: $("#customerdetail"),
                                    editor: customerform,
                                    removerid: function(doc) {
                                          return 'customer ' + doc.firstname + ' ' + doc.lastname;
                                       },
                                    headers: [ { name: 'Name', cssclass: 'name',
                                                 value: function(row) {
                                                        if (row.value.lastname && row.value.firstname) {
                                                            return row.value.lastname + ', ' + row.value.firstname;
                                                        } else {
                                                            return row.value.firstname ? row.value.firstname
                                                                                        : row.value.lastname;
                                                        }
                                                    }},
                                                { name: 'Email', cssclass: 'email',
                                                  value: function(row) { return row.value.email; }},
                                                { name: 'Phone', cssclass: 'phone',
                                                  value: function(row) { return row.value.phonenumber; }},
                                        ]
     });

    $("#submitsearch").click( function(event) {
        var query = $("input#searchquery").val().toLowerCase();
        db.view('couchinv/customer-docs-by-any-name?startkey="' + query + '"&endkey="'
                                                       + query + '\u9999"' ,
            { success: function(data) {
                customer_item_list.draw(data.rows);
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
    db.view("couchinv/customer-docs-by-any-name", {
        success: function(data) {
           customer_item_list.draw( data.rows);
        }
    });
}


function customerform(doctoedit) {
    var fields = [  { type: 'text', label: 'First name', id: 'firstname', validate: 'notblank',
                      value: (doctoedit ? doctoedit.firstname : '') },
                    { type: 'text', label: 'Last name', id: 'lastname',
                      value: (doctoedit ? doctoedit.lastname : '') },
                    { type: 'textarea', label: 'Address', id: 'address', rows: 4, cols: 40,
                      value: (doctoedit ? doctoedit.address : '') },
                    { type: 'text', label: 'Phone number', id: 'phonenumber',
                      value: (doctoedit ? doctoedit.phonenumber : '') },
                    { type: 'text', label: 'Email', id: 'email',
                      value: (doctoedit ? doctoedit.email : '') },
                    { type: 'textarea', label: 'Notes', id: 'notes', rows: 4, cols: 40,
                      value: (doctoedit ? doctoedit.notes : '') }
                ];
    if (doctoedit) {
        fields.push({ type: 'hidden', id: 'docid', value: doctoedit._id});
    }
    var form = new EditableForm({
                    title: (doctoedit ? 'Edit' : 'Add') + ' Customer',
                    modal: 1,
                    fields: fields,
                    buttons: [ { id: 'update', label: (doctoedit ? 'Update' : 'Add'), action: 'submit' },
                               { id: 'cancel', label: 'Cancel' , action: 'remove' },
                            ],
                    submit: function(event) {
                                var theform = this;
                                db.saveDoc(build_customer_doc_from_form(doctoedit, theform),
                                    { success: function() {
                                        theform.remove();
                                        initial_customer_list();
                                    }}
                                );
                                return false;
                            }
                });
}

function build_customer_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    var fields = ['firstname','lastname','address','phonenumber','email','notes'];
    for (var i in fields) {
        var fieldname = fields[i];
        var formvalue = form.valueFor(fieldname);
        if (formvalue == undefined) {
            formvalue = '';
        }
        doc[fieldname] = formvalue;
    }
    doc.type	    = 'customer';

    return doc;
}
