function(doc) {
    if (doc.type == 'item') {
        if (doc.sku) {
            emit(doc.sku,{ name: doc.name, sku: doc.sku, barcode: doc.barcode });
        }
    }
  
}
