$(function() {
    
    // Models.
    
    window.Document = Backbone.Model.extend({
        initialize: function() {
            if (!this.get("title")) {
                this.set(
                    {'title': 'No Title Yet'}
                );
            }
        }
    });
    
    
    // Collections.
    
    window.DocumentList = Backbone.Collection.extend({
        model: Document,
        localStorage: new Store("documents"),
        comparator : function(doc) {
            return doc.get('title');
        }
    });
    
    window.Documents = new DocumentList;
    
    
    // Views.
    
    window.DocumentView = Backbone.View.extend({
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
    
    
    // Application.
    
    window.ToolbarView = Backbone.View.extend({
        el: $('#toolbar'),
        events: {
            "click #addBtn": "addDocument"
        },
        addDocument: function(e) {
            var doc = Documents.create({'title': 'my title'});
            var view = new DocumentView({model: doc});
            $('#doclist').append(view.render().el);
        }
    });
    
    window.App = new ToolbarView;
    
});


