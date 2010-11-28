// Simple generic list view for Backbone.js.
(function() {

    Backbone.CollectionView = Backbone.View.extend({
        collection: null, // The collection being displayed.
        itemView: null, // A view for displaying a single item in the list.
    
        selected: null,
        initialize: function() {
            _.bindAll(this, 'addItem', 'removeItem', 'render',
                            'setSelection', 'saveItem');
            this.collection.bind("add", this.addItem);
            this.collection.bind("remove", this.removeItem);
            this.collection.bind("refresh", this.render);
            this.collection.bind("change", this.saveItem);
        },
        render: function() {
            this.collection.each(this.addItem);
            if (this.selected) {
                this.selected.view.setSelected(true);
            }
            return this;
        },
    
        addItem: function(model) {
            if (!model.isNew() && this.include(model)) {
                var view = new (this.itemView)({'model': model});
                $(this.el).append(view.render().el);
            }
        },
        removeItem: function(model) {
            if (this.selected == model) {
                this.selected = null;
            }
            model.view.remove();
        },
        saveItem: function(model) {
            // We don't add unindexed models to the view, so add them now.
            if (!model.view) {
                this.addItem(model);
            }
        },
        
        setSelection: function(model) {
            if (this.selected) {
                this.selected.view.setSelected(false);
            }
            if (model) {
                this.selected = model;
                this.selected.view.setSelected(true);
                this.didSelect(this.selected.view);
            } else {
                this.selected = null;
            }
        },
        
        didSelect: function(view) {
        },
        include: function(model) {
            // Filter the collection.
            return true;
        }
    });

    Backbone.CollectionItemView = Backbone.View.extend({
        // This function sets the "selectedness" appearance of the
        // view. The default implementation adds or removes the
        // "selected" class from this.el.
        setSelected: function(selected) {
            if (selected) {
                $(this.el).addClass('selected');
            } else {
                $(this.el).removeClass('selected');
            }
        }
    });

})();
