function(doc) {
    if (doc.type == 'customer') {
        var a = [];
        if (doc.firstname) {
	    a.push(doc.firstname);
	}
	if (doc.lastname) {
	    a.push(doc.lastname);
	}
        emit(a.join(' '),doc);
    }
}
