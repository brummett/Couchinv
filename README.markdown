## CouchInv - Manage inventory and orders for a small business

CouchInv aims to be a browser app to keep track of customers, inventory, and orders for a small business.
It uses [CouchDB](http://couchdb.apache.org) as the application server and to store the data.

This souce repo is a CouchApp.  To get it into your database, use the couchapp command line
tool. [More info about CouchApps here.](http://couchapp.org)

## What's working

Not much, yet.  You can add inventory items, customers and warehouses. Receiving an order works.

## Workflow

### Define one or more warehouses

Go to the "Warehouses" page.  Click on "Add Warehouse".  The only required
field is "Name".

### Receiving a shipment

Go to the "Receive Shipment" page.  Input the shipment order number, which
must be unique.  Input the vendor that sent the items.  This vendor becomes
a "customer" and generates a customer document.

Put the "scan" text input into focus and start entering barcodes and/or SKUs.
Any items the system does not know about are highlited in red.  Click on the
red lines to bring up the "Add new item" dialog.

When the order is complete, click the "All done" button.  Any invalid fields
will be noted.

### Making a sale order

Go to the "Sale" page.  Just like the "Receive Shipment" page, fill in the
required fields and scan in items.  Each scanned item will also need a
unit price.



