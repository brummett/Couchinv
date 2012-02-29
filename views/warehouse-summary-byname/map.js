// a warehouse looks like this:
// name: string
// inventory: { item-doc_id: howmany }
function(doc) {
    if (doc.type == 'warehouse') {
        var sum = 0;
        var count = 0;
        for (var key in doc.inventory) {
            if (doc.inventory.hasOwnProperty(key)) {
                count++;
                sum += doc.inventory[key];
            }
        }
        emit(doc.name, { unique_items: count, total_items: sum });
    }
}
