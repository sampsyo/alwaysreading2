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
        subviews: [],
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
            this.subviews[doc.id] = view;
        },
        setSelected: function(docId) {
            if (this.curSelection) {
                this.curSelection.setSelected(false);
            }
            if (docId) {
                this.curSelection = this.subviews[docId];
                this.curSelection.setSelected(true);
            } else {
                this.curSelection = null;
            }
        },
        unselect: function(e) {
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
                docListView.setSelected(this.selected.id);
                docDisplayView.display(this.selected);
            } else {
                docListView.setSelected(null);
                docDisplayView.hide();
            }
        }
    });
    window.app = new ARApp;
    
});
