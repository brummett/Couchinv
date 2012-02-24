// spec is a data structure like this:
// { list: div to draw the list
//   detail: div to draw the detail
//   headers: [ { name: 'Header Name',
//                value: function to return a string, passed in the doc
//                cssclass: 'css class for its span'
//              }
//           ]
//   editor: function to edit a record, passed in a doc
//   removerid: function to return a string identifying the removed thing, passed in a doc
               
function draw_item_list (spec, rows) {
    var list = spec.list;
    var detail = spec.detail;
    var headers = spec.headers;
    var editor = spec.editor;
    var removerid = spec.removerid;

    var datamap = {};  // keyed by docid value is the doc

    list.empty();
    detail.empty();

    var ul = $('<ul class="itemlist"/>');
    var html = '<lh class="itemrow">';
    for (var i in headers) {
        html = html + '<span>' + headers[i].name + '</span>';
    }
    html = html + '</lh>';

    for (var i in rows) {
        var doc = rows[i].value;
        var docid = doc._id;
        datamap[docid] = doc;

        html = html + '<li id="' + docid + '" class="itemrow">';
        $.each(headers, function (idx, header) {
            html = html + '<span class="' + (header.cssclass ? header.cssclass : '')  + '">'
                    + header.value(doc) + '</span>';
        });
        html = html + '<span class="editremove"><a href="#" id="' + docid + '" class="edit">Edit</a>   '
                + '<a href="#" id="' + docid + '" class="remove">Remove</a></span></li>';
    }
    ul.append(html);
    list.append(ul);

    // Show detail about the item on in the 'detail' element when you click on it
    $(".itemrow").click( function(event) {
        var target = $(event.target);
        if (! target.is('li')) {
            // if the target was one of the spans
            target = target.parents('li');
        }
        var docid = target.attr('id');
        if (! docid) {
            // they clicked on the header
            return false;
        }
        var doc = datamap[docid];
        $(".itemrow").removeClass('selected');
        target.addClass('selected');

        var detailhtml = '<ul class="itemdetail">';
        for (var key in doc) {
            if (key.substr(0,1) != '_') {  // skip _id, _rev and such
                detailhtml = detailhtml + '<li><span>' + key + '</span><span>'
                                + doc[key] + '</span></li>';
            }
        }
        detail.empty();
        detail.append(detailhtml);
        detail.attr('data-docid', docid);

        return false;
    });

    $("a.edit", ul).click(function (event) {
        var target = $(event.target);
        var docid = target.attr('id');
        db.openDoc(docid, { success: editor });
        return false;
    });

    $("a.remove", ul).click( function (event) {
        var target = $(event.target);
        var docid = target.attr('id');
        db.openDoc(docid, { success: function(doc) {
            var popuphtml = '<h1>Confirm Remove</h1><p>Are you sure you want to delete '
                    + removerid(doc) + '<p>'
                    + '<input type="submit" name="submit" id="Remove" value="Yes, remove it"/>'
                    + '<input type="submit" name="submit" id="Cancel" value="No, it\'s a mistake"/>';
            var popup = popup_dialog(popuphtml);
            popup.addClass('warning');

            $("input#Remove", popup).click( function(event) {
                db.removeDoc(doc, { success: function() {
                    target.parents("li.itemrow").remove();
                    if (detail.attr('data-docid') == docid) {
                        detail.empty();
                    }
                }});
                popup_cleanup(popup);
                return false;
            });

            $("input#Cancel", popup).click( function(event) {
                popup_cleanup(popup);
                return false;
            });
        }});
        return false;
    });
}
               
