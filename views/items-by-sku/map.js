function(doc) {
    if (doc.type == 'item') {
        if (doc.sku) {
            var retval = { name: doc.name, sku: doc.sku, barcode: doc.barcode };
            if (doc.cost_cents != undefined) {
                retval.cost_cents = doc.cost_cents;
            }
            if (doc.price_cents != undefined) {
                retval.price_cents = doc.price_cents;
            }
            emit(doc.sku,retval);
        }
    }
  
}
