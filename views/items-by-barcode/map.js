function(doc) {
    if (doc.type == 'item') {
        if (doc.barcode) {
            emit(doc.barcode,{ name: doc.name, sku: doc.sku, barcode: doc.barcode });
        }
    }
  
}
