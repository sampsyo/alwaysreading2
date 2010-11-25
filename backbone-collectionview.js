// Simple generic list view for Backbone.js.
(function() {

    Backbone.CollectionView = Backbone.View.extend({
        collection: null, // The collection being displayed.
        itemView: null, // A view for displaying a single item in the list.
    
        subviews: [],
        selectedView: null,
        initialize: function() {
            _.bindAll(this, 'addItem');
            this.collection.bind("add", this.addItem);
        },
        render: function() {
            this.collection.each(this.addItem);
            return this;
        },
    
        addItem: function(model) {
            var view = new (this.itemView)({'model': model});
            $(this.el).append(view.render().el);
            this.subviews[model.id] = view;
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
        },
    });

    Backbone.CollectionItemView = Backbone.View.extend({
        setSelected: function(selected) {
            // Implement this!
        }
    });

})();
