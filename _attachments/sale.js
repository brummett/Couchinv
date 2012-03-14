// Performing a sale meeans creating either a picklist or a shippedorder

function build_sale_activity() {
    var activity = $('div#activity');
    activity.empty();

    var form = sale_form(null, build_sale_activity);
    form.draw(activity);
}
    


function sale_form(doctoedit, next_action) {

    var itemlist;
    var scanaction = function(event, scan, form) {
        if (scan.length) {
            form.widget.itemlist.__add_scan(scan);
        }
    };

    var form, submit_form_1, submit_form_2;
    // When they click the 'all done' button
    submit_form_1 = function (event) {
        // clear previous errors
        $('.invalid').removeClass('invalid');
        $('span.errortext').text('');

        form.validateInputs();

        // Even if there were errors found, go ahead and make sure
        // the order number is unique among picklists
        var ordernumber = form.input.ordernumber.val();
        if (ordernumber) {
            db.view('couchinv/order-exists-by-type-and-order-number?key=["picklist","' + ordernumber+ '"]',
                { success: function(data) {
                    if (data.rows.length > 0) {
                        form.widget.ordernumber.__markError('* Duplicate');
                        return false;
                    } else {
                        if (form.isValid()) {
                            submit_form_2();
                        }
                    }
                }}
            );
        }
        return false;
    };

    submit_form_2 = (function(next_action) {
        return function () {
            var inputs = form.input;
            var vendorname = inputs.shiporigin.val();
            var order = {   type: 'picklist',
                            ordernumber: inputs.ordernumber.val(),
                            vendorname: vendorname,
                            vendorid: form.customer_id_for_name[vendorname],
                            warehouseid: inputs.shipdestination.val(),
                            date: inputs.date.val(),
                            items: inputs.itemlist,
                        };
            db.saveDoc(order,
                { success: function() {
                                    var popup;
                                    popup = new EditableForm({
                                        title: 'Created Picklist',
                                        modal: 1,
                                        buttons: [{ id:'ok', label: 'Ok', action: 'submit'}],
                                        submit: function(event) {
                                            popup.remove();
                                            next_action(form);
                                            return false;
                                        }
                                    });
                }}
             );
        }
    })(next_action);

    form = new ItemTransactionForm({
        title: (doctoedit ? 'Edit' : 'Create') + ' Picklist',
        layout: [ { type: 'date', label: 'Date', id: 'date',
                    value: (doctoedit ? doctoedit.date : undefined) },
                  { type: 'text', label: 'Order number', id: 'ordernumber', required: true,
                    value: (doctoedit ? doctoedit.ordernumber : '') },
                  { type: 'customer', label: 'Customer', id: 'customerid',
                    value: (doctoedit ? doctoedit.customerid : '') },
                  { type: 'warehouse', label: 'Shipped from', id: 'warehouseid',
                    value: (doctoedit ? doctoedit.warehouseid : undefined) },
                  { type: 'select', label: 'Ship service level', id: 'shipservicelevel',
                    options: ['standard','expedited','overnight'],
                    value: (doctoedit ? doctoedit.shipservicelevel : undefined) },
                  { type: 'text', label: 'Product charge $', id: 'productcharge', required: true,
                    value: (doctoedit ? doctoedit.productcharge : '') },
                  { type: 'text', label: 'Shipping charge $', id: 'shippingcharge', required: true,
                    value: (doctoedit ? doctoedit.shippingcharge : '') },
                  { type: 'select', label: 'Order source', id: 'ordersource',
                    options: ['web','amazon','phone','ebay','buy.com'],
                    value: (doctoedit ? doctoedit.ordersource : undefined) },
                  { type: 'scanbox', id: 'scan', action: scanaction },
                  { type: 'button', id: 'alldone', label: 'All Done', action: submit_form_1 },
                  { type: 'itemlist', id: 'itemlist', modifiable: true, include_price: true }
                ]
     });

    itemlist = form.widget.itemlist;

    if (doctoedit) {
        // still need to pre-fill all the items in the already existing order
        for (var barcode in doctoedit.items) {
            itemlist.__add(barcode, doctoedit.items[barcode]);
        }
    }
    return form;
}
