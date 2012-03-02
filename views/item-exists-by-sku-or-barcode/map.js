function(doc) {
    if (doc.type == 'item') {
        if (doc.sku) {
            emit(doc.sku,'sku');
        }
        if (doc.barcode) {
            emit(doc.barcode, 'barcode');
        }
    }
  
}
