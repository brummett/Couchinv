// This view has the problem that it lists the same document as the value
// twoce: once for firsrname lastname and again for lastname firstname
// It seems that couchdb has no good way to make it unique in the view, so
// the client code will have to do that
function(doc) {
    if (doc.type == 'customer') {
        var first = [];
        var last = [];
        if (doc.firstname && doc.lastname) {
            emit(doc.firstname + ' ' + doc.lastname, doc);
            emit(doc.lastname + ' ' + doc.firstname, doc);
        } else {
            emit ((doc.firstname ? doc.firstname : doc.lastname), doc);
        }
    }
}
