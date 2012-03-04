function(doc) {
    if (doc.type == 'item') {
        if (doc.name) {
            emit(doc.name,doc);
        }
    }
  
}
