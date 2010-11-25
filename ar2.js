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
    
    window.DocumentItemView = Backbone.CollectionItemView.extend({
        tagName: "li",
        template: _.template($('#doclistitem-template').html()),
        events: {
            "click": "select",
        },
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        },
        setSelected: function(selected) {
            if (selected) {
                $(this.el).addClass('selected');
            } else {
                $(this.el).removeClass('selected');
            }
        },
        select: function(e) {
            app.select(this.model);
            return false;
        }
    });
    
    window.DocumentListView = Backbone.CollectionView.extend({
        collection: documentList,
        itemView: DocumentItemView,
        
        el: $('#doclist'),
        events: {
            "click": "unselect"
        },
        unselect: function(e) {
            app.select(null);
        }
    });
    window.docListView = new DocumentListView;
    
    
    // Document display view.
    
    window.DocumentDisplayView = Backbone.View.extend({
        el: $('#docdisplay'),
        template: _.template($('#docdisplay-template').html()),
        initialize: function() {
            _.bindAll(this, 'display', 'hide');
        },
        display: function(doc) {
            this.el.html(this.template(doc.toJSON()));
            this.el.show();
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
            "click #addBtn": "addDocument",
            "click #removeBtn": "removeDocument"
        },
        addDocument: function(e) {
            var doc = documentList.create({'title': 'my title'});
        },
        removeDocument: function(e) {
            if (app.selected) {
                documentList.remove(app.selected);
                app.selected = null;
            }
        }
    });
    window.toolbarView = new ToolbarView;
    
    
    // Principal controller.
    
    window.ARApp = Backbone.Controller.extend({
        selected: null,
        routes: {
            "documents/:docid": "selectId"
        },
        initialize: function() {
            _.bindAll(this, 'select');
            
            // Populate initial document list.
            documentList.fetch();
            docListView.render();
        },
        select: function(doc) {
            this.selected = doc;
            if (this.selected) {
                docListView.setSelection(this.selected.id);
                docDisplayView.display(this.selected);
                this.saveLocation('documents/' + this.selected.id);
            } else {
                docListView.setSelection(null);
                docDisplayView.hide();
                this.saveLocation('');
            }
        },
        selectId: function(docId) {
            this.select(documentList.get(docId));
        }
    });
    window.app = new ARApp;
    Backbone.history.start(); // route the first hash
    
});
