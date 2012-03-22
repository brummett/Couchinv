function(doc) {

    // More important orders have a lower priority score and sort earlier
    var ship_prio = { overnight: 0, expedited: 100, standard: 200, other: 300 };
    var source_prio = { web: 0, phone: 1, amazon: 2, ebay: 3, 'buy.com': 4, other: 5 };
    if (doc.type && (doc.type == 'unshippedorder') && doc.warehouseid) {
        var priority = 0;
        if (doc.shipservicelevel in ship_prio) {
            priority += ship_prio[doc.shipservicelevel];
        } else {
            priority += ship_prio['other'];
        }

        if (doc.ordersource in source_prio) {
            priority += source_prio[doc.ordersource];
        } else {
            priority += source_prio['other'];
        }
        
        emit ([doc.warehouseid, priority], doc);
    }
}
