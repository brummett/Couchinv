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

    var num_columns = headers.length + 1;  // +1 because of edit/remove
    var column_width = (100 / num_columns) + '%';
    var datamap = {};  // keyed by docid value is the doc

    list.empty();
    detail.empty();

    var ul = $('<ul class="itemlist"/>');
    var html = '<lh class="itemrow">';
    for (var i in headers) {
        html = html + '<span class="datawidth">' + headers[i].name + '</span>';
    }
    html = html + '</lh>';

    if (rows.length == 0) {
        html = html + '<li class="itemrow">No matches</li>';
    } else {

        for (var i in rows) {
            var doc = rows[i].value;
            var docid = rows[i].id;
            if (! datamap[docid]) {  // Don't print duplicate documents
                datamap[docid] = doc;

                html = html + '<li id="' + docid + '" class="itemrow">';
                $.each(headers, function (idx, header) {
                    html = html + '<span class="' + (header.cssclass ? header.cssclass : '')  + ' datawidth">'
                            + header.value(rows[i]) + '</span>';
                });
                html = html + '<span class="editremove"><a href="#" id="' + docid + '" class="edit">Edit</a>   '
                        + '<a href="#" id="' + docid + '" class="remove">Remove</a></span></li>';
            }
        }
    }
    ul.append(html);
    list.append(ul);

    $(".datawidth").css('width', column_width);

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
            var popup = new EditableForm({
                            title: 'Confirm Remove',
                            modal: 1,
                            class: 'warning',
                            fields: [ { type: 'label',
                                        label: 'Are you sure you want to delete '
                                                + removerid(doc) }
                                    ],
                            buttons: [ { id: 'remove',
                                         label: 'Yes, remove it',
                                         action: 'submit' },
                                       { id: 'cancel',
                                         label: 'No, it\'s a mistake',
                                         action: 'remove' }
                                    ],
                            submit: function (event) {
                                db.removeDoc(doc, { success: function() {
                                    target.parents("li.itemrow").remove();
                                    if (detail.attr('data-docid') == docid) {
                                        detail.empty();
                                    }
                                }})
                                return true;
                            }
                    });

        }});
        return false;
    });
}
               
