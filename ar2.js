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
        comparator: function(doc) {
            return doc.get('title');
        }
    });
    window.documentList = new DocumentList;
    
    
    // Document list views.
    
    window.DocumentListView = Backbone.View.extend({
        el: $('#doclist'),
        curSelection: null,
        events: {
            "click": "unselect"
        },
        initialize: function() {
            _.bindAll(this, 'addDocument'); // make 'this' work
            documentList.bind("add", this.addDocument);
        },
        render: function() {
            documentList.each(this.addDocument);
            return this;
        },
        addDocument: function(doc) {
            var view = new DocumentItemView({model: doc});
            this.el.append(view.render().el);
        },
        unselect: function(e) {
            if (this.curSelection) {
                this.curSelection.unselect();
            }
            app.select(null);
        }
    });
    window.docListView = new DocumentListView;
    
    window.DocumentItemView = Backbone.View.extend({
        tagName: "li",
        template: _.template($('#doclistitem-template').html()),
        events: {
            "click": "select",
        },
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setContent();
            return this;
        },
        setContent: function() {
            var title = this.model.get('title');
            this.$('.title').text(title);
        },
        select: function(e) {
            if (docListView.curSelection == this) {
                return false;
            }
            $(this.el).addClass('selected');
            if (docListView.curSelection) {
                docListView.curSelection.unselect();
            }
            docListView.curSelection = this;
            app.select(this.model);
            return false;
        },
        unselect: function(e) {
            $(this.el).removeClass('selected');
            docListView.curSelection = null;
            return false;
        }
    });
    
    
    // Document display view.
    
    window.DocumentDisplayView = Backbone.View.extend({
        el: $('#docdisplay'),
        initialize: function() {
            _.bindAll(this, 'display', 'hide');
        },
        display: function(doc) {
            this.el.show();
            this.$('.title').text(doc.get('title'));
        },
        hide: function(doc) {
            this.el.hide();
        }
    });
    window.docDisplayView = new DocumentDisplayView;
    
    
    // The toolbar controls.
    
    window.ToolbarView = Backbone.View.extend({
        el: $('#toolbar'),
        events: {
            "click #addBtn": "addDocument"
        },
        addDocument: function(e) {
            var doc = documentList.create({'title': 'my title'});
        }
    });
    window.toolbarView = new ToolbarView;
    
    
    // Principal controller.
    
    window.ARApp = Backbone.Controller.extend({
        selected: null,
        initialize: function() {
            _.bindAll(this, 'select');
            
            // Populate initial document list.
            documentList.fetch();
            docListView.render();
        },
        select: function(doc) {
            this.selected = doc;
            if (this.selected) {
                docDisplayView.display(this.selected);
            } else {
                docDisplayView.hide();
            }
        }
    });
    window.app = new ARApp;
    
});
