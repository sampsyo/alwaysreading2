$(function() {
    
    // Model.
    
    window.Document = Backbone.Model.extend({
        initialize: function() {
            if (!this.get("title")) {
                this.set(
                    {'title': 'No Title Yet'}
                );
            }
        }
    });
    
    window.DocumentList = Backbone.Collection.extend({
        model: Document,
        localStorage: new Store("documents"),
        comparator : function(doc) {
            return doc.get('title');
        }
    });
    
    window.Documents = new DocumentList;
    
    
    // Document list views.
    
    window.DocumentItemView = Backbone.View.extend({
        tagName: "li",
        template: _.template($('#doclistitem-template').html()),
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setContent();
            return this;
        },
        setContent: function() {
            var title = this.model.get('title');
            this.$('.title').text(title);
        }
    });
    
    
    // The toolbar controls.
    
    window.ToolbarView = Backbone.View.extend({
        el: $('#toolbar'),
        events: {
            "click #addBtn": "addDocument"
        },
        addDocument: function(e) {
            var doc = Documents.create({'title': 'my title'});
            var view = new DocumentItemView({model: doc});
            $('#doclist').append(view.render().el);
        }
    });
    
    window.Toolbar = new ToolbarView;
    
});
