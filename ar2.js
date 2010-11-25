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
        localStorage: new Store("documents")
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
    
    
    // Document display/edit views.
    
    var HideShowView = Backbone.View.extend({
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
    
    window.DocumentDisplayView = HideShowView.extend({
        el: $('#docdisplay'),
        template: _.template($('#docdisplay-template').html())
    });
    window.docDisplayView = new DocumentDisplayView;
    
    window.DocumentEditView = HideShowView.extend({
        el: $('#docedit'),
        template: _.template($('#docedit-template').html())
    });
    window.docEditView = new DocumentEditView;
    
    
    // The toolbar controls.
    
    window.ToolbarView = Backbone.View.extend({
        el: $('#toolbar'),
        events: {
            "click #addBtn": "addDocument",
            "click #removeBtn": "removeDocument",
            "click #editBtn": "editDocument"
        },
        addDocument: function(e) {
            var doc = documentList.create({'title': 'my title'});
        },
        removeDocument: function(e) {
            if (app.selected) {
                app.selected.destroy();
                app.selected = null;
            }
        },
        editDocument: function(e) {
            if (app.selected) {
                app.edit(app.selected);
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
            docEditView.hide();
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
        edit: function(doc) {
            docDisplayView.hide();
            docEditView.display(doc);
        },
        selectId: function(docId) {
            this.select(documentList.get(docId));
        }
    });
    window.app = new ARApp;
    Backbone.history.start(); // route the first hash
    
});
