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
        var query = $("input#searchquery").val();
        db.view("couchinv/items-byname", {
            success: function(data) {
                var matching = $.grep(data.rows, function(doc,idx) {
                    var value = doc.value;
                    return (value.name && (value.name.toString().indexOf(query) > -1))
                           || (value.sku && (value.sku.toString().indexOf(query) > -1))
                           || (value.barcode && (value.barcode.toString().indexOf(query) > -1))
                           || (value.desc && (value.desc.toString().indexOf(query) > -1));
                });
                update_inventory_list(matching);
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
            update_inventory_list(data.rows);
        }
    });
}




function update_inventory_list(rows) {
    $("#itemslist").empty();
    $("#itemdetail").empty();

    $("#itemslist").append('<div class="itemheader"><span>Name</span><span>SKU</span><span>count</span></div>');
    for (i in rows) {
        var itemid = rows[i].value._id;
        $("#itemslist").append('<div id="' + itemid + '" class="itemrow">'
                          + '<span>'        + rows[i].value.name
                          + '</span><span>' + rows[i].value.sku
                          + '</span><span>' + rows[i].value.count
                          + '</span><span>'
                          + '<a href="#" id="' + itemid + '" class="edit">Edit</a>  '
                          + '<a href="#" id="' + itemid + '" class="remove">Remove</a>'
                          + '</span></div>'
                        );
    }

    // When one of the item rows is clicked
    $("#itemslist .itemrow").click(function(event) {
        var target = $(event.target);
        if (! target.is('div')) {
            // target is a span, get at the containing div
            target = target.parents('div');
        }
        var docid = target.attr('id');
        db.openDoc(docid, { success: function(doc) {
            $(".itemrow").removeClass('selected');
            target.addClass('selected');
            var detailhtml = '';
            for (var key in doc) {
                if (key.substr(0,1) != '_') {  // skip _id, _rev and such
                    detailhtml = detailhtml + '<p>' + key + ': ' + doc[key] + '</p>';
                }
            }
            var itemdetail = $("#itemdetail");
            itemdetail.empty();
            itemdetail.append(detailhtml);
        }});
        return false;
    });

    // When the "Edit" link is clicked
    $("#itemslist a.edit").click(function(event) {
        var target = $(event.target);
        var docid = target.attr('id');
        db.openDoc(docid, { success: function(doc) {
            itemform(doc);
        }});
       return false;
    });

    // When the "Remove" link is clicked
    $("#itemslist a.remove").click(function(event) {
        var target =$(event.target);
        var docid = target.attr('id');
        db.openDoc(docid, { success: function(doc) {
            var popup_html = '<H1>Confirm Remove</H1>Are you sure sure '
                   + 'you want to delete ' + doc.name + '<p></p>'
                   + '<input type="submit" name="submit" id="Remove" value="Yes, remove it"/>'
                   + '<input type="submit" name="submit" id="Cancel" value="No, it\'s a mistake"/>';
            var popup = popup_dialog(popup_html);

            popup.children("input#Remove").click(function(event) {
                db.removeDoc(doc, { success: function() {
                    target.parents("div.itemrow").remove();
                }});
                popup_cleanup(popup);
                return false;
            });
            popup.children("input#Cancel").click(function(event) {
                popup_cleanup(popup);
                return false;
            });
        }});
        return false;
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
        + '<tr><td>Name</td>'
        + '<td><input name="name" type="text" id="name" value="'
            + (doctoedit ? doctoedit.name : '')
            + '"/></td></tr>'

        + '<tr><td>SKU</td>'
        + '<td><input name="sku" type="text" id="sku" value="'
            + (doctoedit ? doctoedit.sku : '')
            + '"/></td></tr>'

        + '<tr><td>Barcode</td>'
        + '<td><input name="barcode" type="text" id="barcode" value="'
            + (doctoedit ? doctoedit.barcode : '' )
            + '"/></td></tr>'

        + '<tr><td>Description</td>'
        + '<td><textarea name="desc" rows="5" cols="40" id="desc">'
            + (doctoedit ? doctoedit.desc : '' )
            + '</textarea></td></tr>'

        + '<tr><td>Count</td>'
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
              db.saveDoc(build_item_doc_from_form(doctoedit,form),
                         { success: function() {
                                        popup_cleanup(itemform);
                                        initial_inventory_list();
                                     }
                   });
        return false;
    });

    form.children('input.cancel').bind('click',
        function(event) {
            popup_cleanup(itemform);
            return false;
        }
    );

}

function build_item_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    doc.name    = form.find("input#name").val();
    doc.sku     = form.find("input#sku").val();
    doc.barcode = form.find("input#barcode").val();
    doc.count   = form.find("input#count").val();
    doc.desc    = form.find("textarea#desc").val();
    doc.type    = 'item';

    return(doc);
}


