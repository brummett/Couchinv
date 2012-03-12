// Make a screen for some particular kind of order
//
// The order lifecycle goes:
//  receive (receive items to a warehouse) - END
//  
//  picklist (list items someone ordered)
//  filledorder ( confirm items packed into the box)
//  shippedorder (confirm box was shipped) - END
//
// inventoryadjustment (after a physical inventory) - END
//
// spoiledproduct ( mark items that are expired or broken) - END

// params are:
//  title
//  containing_div
//  layout: [ { type: widget_type, label: string, value: default_Val, id: string, validate: V} ...]
//
// widget types: text, customer, warehouse, scanbox, itemlist, label, date

function ItemTransactionForm (params) {

    this.containing_div = undefined;
    this.type = params.type;
    this.title = params.title;

    this.layout = params.layout;
    this.widget = {};
    this.input = {};

    this.layoutWidgets();
}

ItemTransactionForm.prototype.draw = function(container) {
    container.append(this.containing_div);
}

ItemTransactionForm.prototype.layoutWidgets = function() {
    var div = $('<div class="item_transaction"><h1>' + this.title + '<h1></div>');
    this.containing_div = div;
    var self = this;

    for (var i in this.layout) {
        var layout = this.layout[i];

        var widget = undefined;
        switch (layout.type) {
            case 'date':
                widget = this.dateWidget(layout);
                break;
            case 'text':
                widget = this.textWidget(layout);
                break;
            case 'customer':
                widget = this.customerWidget(layout);
                break;
            case 'warehouse':
                widget = this.warehouseWidget(layout);
                break;
            case 'scanbox':
                widget = this.scanboxWidget(layout);
                break;
            case 'itemlist':
                widget = this.itemlistWidget(layout);
                break;
            case 'label':
                widget = this.labelWidget(layout);
                break;
            case 'button':
                widget = this.buttonWidget(layout);
                break;
        }
        if (widget) {
            widget.__input = function() {
                for (id in self.widget) {
                    if (self.widget[id] === this) {
                        return self.input[id];
                    }
                }
            };
            widget.__markError = function (text) {
                this.addClass('invalid');
                var text_space = this.find('span.errortext');
                text_space.text(text);
                var input = this.__input();
                if ('focus' in input) {
                    // only text inputs can be focused, not the item list
                    input.focus();
                }
                return text_space;
            };
                
            div.append(widget);
        }
    }
    return div;
}

ItemTransactionForm.prototype.validateInputs = function(inputs) {
    if ((! inputs) || (! inputs.length)) {
        inputs = [];
        for (var k in this.widget) {
            inputs.push(this.widget[k]);
        }
    }

    var retval = true;
    for (var i in inputs) {
        if (! inputs[i].__validate() ) {
            retval = false;
        }
    }
    return retval;
}
    

ItemTransactionForm.prototype.dateWidget = function(desc) {
    var id = (desc.id || desc.label);

    var datestr = desc.value;
    if (!datestr) {
        var now = new Date();
        datestr = now.getFullYear() + '-'
               + (now.getMonth() < 10 ? '0' : '') + now.getMonth() + '-'
               + (now.getDate() < 10 ? '0' : '') + now.getDate();
    }

    var widget = $('<div class="datewidget"><span>' + (desc.label || '')
                    + '</span><span><input type="text" id="' + id
                    + '" value="' + datestr + '"/></span><span class="errortext"/></div>');
    var input = $('input', widget);

    widget.__validate = (function(widget,input) {
            return function() {
                var val = input.val();
                if (! val.match(/^\d\d\d\d-\d\d-\d\d$/)) {
                    widget.__markError('* Invalid date');
                    return false;
                } else {
                    return true;
                }
            }
        })(widget, input);
            
    this.widget[id] = widget;
    this.input[id] = input;
    return widget;
}

ItemTransactionForm.prototype.textWidget = function(desc) {
    var id = (desc.id || desc.label);
    var widget = $('<div class="textwidget"><span>'  + (desc.label || '')
                    + '</span><span><input type="text" id="' + id
                    + '" value="' + (desc.value || '') + '"/></span><span class="errortext"/></div>');
    var input = $('input', widget);

    widget.__validate = desc.required
                    ? (function(widget,input) {
                        return function() {
                            var val = input.val();
                            if ((val == undefined) || (val == '')) {
                                widget.__markError('* Required');
                                return false;
                            } else {
                                return true;
                            }
                        }
                    })(widget,input)

                : function() { return true; };

    this.widget[id] = widget;
    this.input[id] = input;
    return widget;
};

ItemTransactionForm.prototype.warehouseWidget = function(desc) {
    var id = (desc.id || desc.label);
    var self = this;

    var widget = $('<div class="warehousewidget"><span>'
                    + (desc.label || '') + '</span><span><select id="' + id + '/></span>'
                    + '<span class="errortext"/></div>');
    var select = $('select', widget);

    var current_warehouseid = desc.value;

    this.warehouse_names = [];
    this.warehouse_id_for_name = {};
    var populator = (function(self,select,current_warehouseid) {
            return function(data) {
                var warehouse_names = [], warehouse_id_for_name = {};
                for (var i in data.rows) {
                    var row = data.rows[i];
                    var wh_name = row.key;
                    var wh_id = row.id;
                    warehouse_names.push(wh_name);
                    warehouse_id_for_name[wh_name] = wh_id
                    var option = $('<option value="' + wh_id + '"'
                                    + (current_warehouseid == wh_id ? ' selected="selected"' : '')
                                    + '>' + wh_name + '</option>');
                    select.append(option);
                }
                self.warehouse_names = warehouse_names;
                self.warehouse_id_for_name = warehouse_id_for_name;
            }
    })(self,select,current_warehouseid);

    if (! this.warehouseLoader) {
        this.warehouseLoader = new DeferredViewAction('couchinv/warehouse-summary-byname');
    }
    this.warehouseLoader.enqueue(populator);

    widget.__validate = function() { return true;};
    this.widget[id] = widget;
    this.input[id] = select;
    return widget;
};

ItemTransactionForm.prototype.customerWidget = function(desc) {
    var id = (desc.id || desc.label);
    var self = this;

    var widget = $('<div class="customerwidget"><span>' + (desc.label || '')
                    + '</span><span><input type="text" id="' + id
                    + '" value="' + (desc.value || '')
                    + '"/></span><span class="errortext"/></span></div>');
    var input = $('input', widget);

    this.customer_names = [];
    this.customer_id_for_name = {};
    var populator = (function(self) {
        return function(data) {
            var customer_names = [], customer_id_for_name = {};
            for (var i in data.rows) {
                var row = data.rows[i];
                customer_names.push(row.key);
                customer_id_for_name[row.key] = row.id;
            }
            self.customer_names = customer_names;
            self.customer_id_for_name = customer_id_for_name;
            input.autocomplete({ lookup: customer_names });
        }
    })(self);

    if (! this.customerLoader) {
        this.customerLoader = new DeferredViewAction('couchinv/customer-exists-by-any-name');
    }
    this.customerLoader.enqueue(populator);

    widget.__validate = (function(form,widget,input) {
        return function() {
            var customer_name = input.val();
            if((customer_name == undefined) || (customer_name = '')) {
                this.__markError('* Required');
            } else {
                if (! self.customer_id_for_name[customer_name]) {
                    var text_space = this.__markError('* Need Info');
                    text_space.click(function(event) {
                        var customer_name = input.val();
                        var firstname, lastname;
                        var space_pos = customer_name.indexOf(' ');
                        if (space_pos == -1) {
                            firstname = customer_name;
                            lastname = '';
                        } else {
                            firstname = customer_name.substr(0,space_pos);
                            lastname = customer_name.substr(space_pos + 1);
                        }
                        customerform({firstname: firstname, lastname: lastname},
                                    function(doc) {
                                        // When they're done putting info in
                                        widget.removeClass('invalid');
                                        // Put this person on the list so we don't have to re-hit the DB
                                        var name = doc.firstname + ' ' + doc.lastname;
                                        form.customer_names.push(name);
                                        form.customer_id_for_name[name] = doc._id;
                                        name = doc.lastname + ' ' + doc.firstname;
                                        form.customer_names.push(name);
                                        form.customer_id_for_name[name] = doc._id;
                                        // Clear the error 
                                        text_space.text('');
                                        widget.removeClass('invalid');
                                    });
                    });
                }
            }
        }
    })(this,widget,input);

    this.widget[id] = widget;
    this.input[id] = input; 
    return widget;
};

ItemTransactionForm.prototype.scanboxWidget = function(desc) {
    var id = (desc.id || desc.label);
    var widget = $('<div cpass="scanboxwidget"><span><form><input type="text" id="' + id + '"/>'
                    + '<input type="submit" value="Scan"/></form></span><span class="errortext"></div>');
    var input = $('input[type="text"]', widget);

    var action = (desc.action || function() { return false });
    var submit = (function(self,action,input) {
        return function(event) {
            action(event,input.val(), self);
            input.val('');
            input.focus();
            return false;
        }
    })(this, action, input);

    widget.__validate = function() { return true; };

    $('form', widget).submit(submit);

    this.widget[id] = widget;
    this.input[id] = input;
    return widget;
};

ItemTransactionForm.prototype.labelWidget = function(desc) {
    var id = (desc.id || desc.label);
    var widget = $('<div class="labelwidget"><span id="' + id + '">' + (desc.label || '')
            + '</span><span class="errortext"/></div>');

    widget.__validate = function() { return true; };

    this.widget[id] = widget;
    return widget;
};

ItemTransactionForm.prototype.buttonWidget = function(desc) {
    var id = (desc.id || desc.label);
    var widget = $('<div class="buttonwidget"><input type="submit" id="'
                    + id + '" value="' + desc.label + '"/></div>');
    var input = $('input', widget);

    var action = (desc.action || function () { return false });

    var click = (function (self) {
            return function(event) {
                action(event,self);
            }
        })(this);
    input.click(click);

    widget.__validate = function() { return true; };

    this.widget[id] = widget;
    this.input[id] = input;
    return widget;
}

ItemTransactionForm.prototype.itemlistWidget = function(desc) {
    var self = this;

    var modifiable = desc.modifiable; // include inc/dec/remove buttons

    var id = (desc.id || desc.label);
    var widget = $('<div class="itemlistwidget"><ul><lh class="itemrow">'
                + (modifiable ? '<span/>' : '')  // column for the inc/dev/remove buttons
                + '<span>Count</span><span>Name</span><span>Scan</span></lh></ul></div>');

    var ul = $('ul', widget);
    var items_in_list = {};

    this.widget[id] = widget;
    this.input[id] = items_in_list;

    widget.__validate = (function(widget) {
                            return function() {
                                var popup, title, message;
                                if (widget.__isEmpty()) {
                                    title = 'No items';
                                    message = 'Add some items to the order first';

                                } else if (widget.find('.unknown_item').length) {
                                    title = 'Unknown items';
                                    message = 'Some items are not yet known to the system';
                                }
                                if (title) {
                                    widget.__markError(title);
                                    popup = new EditableForm({
                                        title: title,
                                        modal: 1,
                                        fields: [{type: 'label', label: message }],
                                        buttons: [{id: 'ok', label: 'Ok', action: 'remove'}]
                                    });
                                    return false;
                                } else {
                                    return true;
                                }
                            }
                        })(widget);

    widget.__isEmpty = function() {
        for (var k in items_in_list) {
            return false;
        }
        return true;
    };

    widget.__initializeFromValues = function(items) {
        for (var barcode in items) {
        }
    };

    widget.__newLine = function(item_name,item_ident,count) {
        var html = '<li class="itemrow" data-item-ident="' + item_ident + '">';
        if (modifiable) {
             html += '<span class="buttons">'
                 + '<a href="#" class="increment"><img src="images/up_arrow_blue.png" alt="increment"></a>'
                 + '<a href="#" class="decrement"><img src="images/down_arrow_blue.png" alt="decrement"></a>'
                 + '<a href="#" class="delete"><img src="images/delete_x_red.png" alt="remove"></a></span>';
        }
        html += '<span class="count">' + count + '</span><span class="name">'
                 + item_name + '</span><span class="barcode">' + item_ident + '</span>';
        return html;
    };

    widget.__updateUnknownLine = function(li, doc) {
        // Update the line to show the newly entered info
        li.find('span.name').text(doc.name);
        li.find('span.barcode').text(doc.barcode);

        // set up the element as a known item
        li.removeClass('unknown_item');
        li.unbind('click');
        var old_ident = li.attr('data-item-ident');
        li.attr('data-item-ident', doc.barcode);

        // update the order record to track by the new item's barcode
        var count = items_in_list[old_ident];
        delete items_in_list[old_ident];
        items_in_list[doc.barcode] = count;
    };

    widget.__onNewLine = function(li,thing) {
        var self = this;
        if (typeof(thing) != 'object') {
            li.addClass('unknown_item');
            li.click( function(event) {
                var newitem = { barcode: thing, name: '', sku: '', desc: '' };
                itemform(newitem, function(doc) { self.__updateUnknownLine(li, doc) });
            });
        }
    };

    widget.__subtract = function(thing, how_many) {
        var item_ident = typeof(thing) == 'object' ? thing.barcode : thing;
        if (how_many == undefined) {
            how_many = 1;
        }

        if (items_in_list[item_ident]) {
            var li = ul.find('li[data-item-ident="' + item_ident + '"]');
            items_in_list[item_ident] -= how_many;
            li.children('span.count').text(items_in_list[item_ident]);
        }
    };

    widget.__add_scan = function(scan, how_many) {
        var widget = this;
        db.view('couchinv/items-by-barcode?key="' + scan + '"',
            { success: function(data) {
                if (data.rows.length) {
                    // found it by barcode
                    widget.__add(data.rows[0].value, how_many);
                } else {
                    db.view('couchinv/items-by-sku?key="' + scan + '"',
                        { success: function(data) {
                            if (data.rows.length) {
                                // found it by sku
                                widget.__add(data.rows[0].value, how_many);
                            } else {
                                // unknown item
                                widget.__add(scan, how_many);
                            }
                        }}
                    );
                }
            }}
        );
    };

    widget.__delete = function(thing) {
        var item_ident = typeof(thing) == "object" ? thing.barcode : thing;

        if (item_ident in items_in_list) {
            delete items_in_list[item_ident];
            ul.find('li[data-item-ident="' + item_ident + '"]').animate(
                { height: '0px' },
                { duration: 500,
                  complete: function() { $(this).remove(); }
                });
        }
    }

    widget.__add = function(thing, how_many) {
        var item_ident, item_name;
        var self = this;

        if (how_many == undefined) {
            how_many = 1;
        }

        if (typeof(thing) == "object") {
            item_ident = thing.barcode;
            item_name = thing.name;
        } else {
            item_ident = thing;
            item_name = '';
        }

        if (item_ident in items_in_list) {
            //already in the order, bump up the count
            items_in_list[item_ident] += how_many;
            ul.find('li[data-item-ident="' + item_ident + '"]').children('span.count')
                    .text(items_in_list[item_ident]);

        } else {
            items_in_list[item_ident] = how_many;
            var new_li = $(this.__newLine(item_name, item_ident, 1));
            ul.append(new_li);
            if (modifiable) {
                $('a.increment', new_li).click( function(event) {
                    self.__add(new_li.attr('data-item-ident'));
                    return false;
                });
                $('a.decrement', new_li).click( function(event) {
                    self.__subtract(new_li.attr('data-item-ident'));
                    return false;
                });
                $('a.delete', new_li).click( function(event) {
                    var popup = new EditableForm({
                            title: 'Confirm Remove',
                            modal: 1,
                            class: 'warning',
                            fields: [ { type: 'label',
                                    label: 'Are you sure you want to remove '
                                            + (item_name ? item_name : item_ident)
                                            + ' from the order'} ],
                            buttons: [ { id: 'remove', label: 'Yes, remove it', action: 'submit' },
                                       { id: 'cancel', label: 'No, it\'s a mistake', action: 'remove'}],
                            submit: function(event) {
                                    self.__delete(new_li.attr('data-item-ident'));
                                    popup.remove();
                                }
                    });
                    return false;
                });
            }
            self.__onNewLine(new_li, thing);
        }
    };

    return widget;
};

