function(doc) {
    var types = { receive: 1, unshippedorder: 1, packedorder: 1, inventoryadjustment:1, spoiledproduct: 1}; 
    if (types[doc.type]) {
        emit (doc.ordernumber, doc);
    }
}
