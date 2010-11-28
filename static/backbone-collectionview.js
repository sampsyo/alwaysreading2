// Simple generic list view for Backbone.js.
(function() {

    Backbone.CollectionView = Backbone.View.extend({
        collection: null, // The collection being displayed.
        itemView: null, // A view for displaying a single item in the list.
    
        subviews: {},
        selectedView: null,
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
            if (this.selectedView) {
                this.selectedView.setSelected(true);
            }
            return this;
        },
    
        addItem: function(model) {
            if (!model.isNew()) {
                var view = new (this.itemView)({'model': model});
                $(this.el).append(view.render().el);
                this.subviews[model.id] = view;
            }
        },
        removeItem: function(model) {
            var view = this.subviews[model.id];
            if (this.selectedView == view) {
                this.selectedView = null;
            }
            view.remove();
        },
        saveItem: function(model) {
            // We don't add unindexed models to the view, so add them now.
            if (!this.subviews[model.id]) {
                this.addItem(model);
            }
        },
        
        setSelection: function(id) {
            if (this.selectedView) {
                this.selectedView.setSelected(false);
            }
            if (id) {
                this.selectedView = this.subviews[id];
                this.selectedView.setSelected(true);
            } else {
                this.selectedView = null;
            }
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
