db = $.couch.db("couchinv");
function update_inventory() {
    $("#items").empty();

    db.view("couchinv/items-byname", {
        success: function(data) {
                     for (i in data.rows) {
                         var itemid = data.rows[i].value._id;
                         $("#items").append('<div id="' + itemid + '" class="itemrow"><span>'
                                           + data.rows[i].value.name
                                           + '</span><span>'
                                           + data.rows[i].value.sku
                                           + '</span><span>'
                                           + data.rows[i].value.count
                                           + '</span><span>'
                                           + '<a href="#" id="' + itemid + '" class="edit">Edit</a>'
                                           + '<a href="#" id="' + itemid + '" class="remove">Remove</a>'
                                           + '</span></div>'
                                         );
                     }
        }
    });
}

function itemform(doctoedit) {
    var formhtml;
    formhtml = '<form name="updateitem" id="updateitem" action="">';

    if (doctoedit) {
        // editing an existing item
        formhtml = formhtml +
            '<input name="docid" id="docid" type="hidden" value="' + doctoedit._id + '"/>';
    }
    formhtml = formhtml + '<table>';

    formhtml = formhtml +
        '<tr><td>Name</td>' 
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
        + '<td><input name="desc" type="text" id="desc" value="'
            + (doctoedit ? doctoedit.desc : '' )
            + '"/></td></tr>'

        + '<tr><td>Count</td>'
        + '<td><input name="count" type="text" id="count" value="'
            + (doctoedit ? doctoedit.count : '0')
            + '"/></td></tr>';

    formhtml = formhtml + 
        '</table>'
        + '<input type="submit" name="submit" class="update" value="'
        + (doctoedit ? 'Update' : 'Add')
        + '"/></form>';

    $("#itemform").empty();
    $("#itemform").append(formhtml);
}

function build_item_doc_from_form(doc,form) {
    if (!doc) {
        doc = new Object;
    }
    doc.name    = form.find("input#name").val();
    doc.sku     = form.find("input#sku").val();
    doc.barcode = form.find("input#barcode").val();
    doc.count   = form.find("input#count").val();
    doc.desc    = form.find("input#desc").val();
    doc.type    = 'item';

    return(doc);
}


$(document).ready(function() {
    update_inventory();

    $("a.add").live('click', function(event) {
        itemform();
    });

    $("input.update").live('click', function(event) {
        var form = $(event.target).parents("form#updateitem");
        db.saveDoc(build_item_doc_from_form(null,form), 
                   { success: function() {
                                  $("form#updateitem").remove();
                                  //form.remove;
                                  update_inventory();
                               }
                   });
        return false;
    });


});
