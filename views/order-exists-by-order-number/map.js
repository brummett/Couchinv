function(doc) {
    var types = { receive: 1, order: 1, shippedorder: 1, inventoryadjustment:1, expiredproduct: 1}; 
    if (types[doc.type]) {
        emit (doc.ordernumber, 1);
    }
}
