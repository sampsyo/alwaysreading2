// Simple selection disable for jQuery.
// Cut-and-paste from:
// http://stackoverflow.com/questions/2700000
$.fn.disableSelection = function() {
    $(this).attr('unselectable', 'on')
           .css('-moz-user-select', 'none')
           .each(function() { 
               this.onselectstart = function() { return false; };
            });
};

$(function() {
    
    // John Gruber's URL regular expression.
    // https://gist.github.com/249502/
    var urlre = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
    
    // Model.
    
    window.Document = Backbone.Model.extend({
        defaults: {
            'title': 'new document',
            'link': '',
            'tags': []
        },
        initialize: function() {
            _.bindAll(this, 'flatten');
        },
        // Enhanced toJSON.
        flatten: function() {
            var obj = this.toJSON();
            obj['tagString'] = this.get('tags').join(' ');
            return obj;
        },
        validate: function(attrs) {
            var errors = [];
            
            // Validate link.
            attrs.link = $.trim(attrs.link);
            if (attrs.link == '' || attrs.link.match(urlre)) {
                // Add 'http://' automatically if necessary.
                if (attrs.link != '' &&
                            !attrs.link.match(/[a-z][\w-]+:\/{1,3}/)) {
                    attrs.link = 'http://' + attrs.link;
                }
            } else {
                errors.push('link');
            }
            
            // Split tags.
            if (typeof(attrs.tags) == 'string') {
                var tagsstr = attrs.tags;
                attrs.tags = [];
                _.each(tagsstr.split(' '), function(tag) {
                    tag = $.trim(tag);
                    // Strip trailing comma.
                    if (tag.length > 0 && tag.charAt(tag.length-1) == ',') {
                        tag = tag.slice(0, tag.length-1);
                    }
                    tag = $.trim(tag);
                    attrs.tags.push(tag);
                });
            }
            
            if (errors.length) {
                return errors;
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
            "dblclick": "edit"
        },
        initialize: function() {
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.view = this;
        },
        render: function() {
            $(this.el).html(this.template(this.model.flatten()));
            return this;
        },
        select: function(e) {
            app.select(this.model);
            return false;
        },
        edit: function(e) {
            // Single-click ("select") already called.
            app.edit();
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
            this.el.html(this.template(doc.flatten()));
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
        template: _.template($('#docedit-template').html()),
        events: {
            "submit": "submit"
        },
        display: function(doc) {
            HideShowView.prototype.display.call(this, doc);
            _.bindAll(this, 'error');
            doc.bind('error', this.error);
        },
        submit: function(e) {
            app.save();
            return false;
        },
        values: function() {
            var attrs = {};
            _.each(this.el.serializeArray(), function(o) {
                attrs[o.name] = o.value;
            });
            return attrs;
        },
        error: function(model, error) {
            // Mark invalid fields.
            this.$('input').removeClass('invalid');
            _.each(error, function(field) {
                this.$('input.' + field).addClass('invalid');
            });
        },
        focus: function(newDoc) {
            this.$('.title').focus();
        }
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
            app.add();
        },
        removeDocument: function(e) {
            app.remove();
        },
        editDocument: function(e) {
            app.edit();
        }
    });
    window.toolbarView = new ToolbarView;
    
    
    // Principal controller.
    
    window.ARApp = Backbone.Controller.extend({
        selected: null,
        editing: false,
        routes: {
            "documents/:docid": "selectId"
        },
        initialize: function() {
            _.bindAll(this, 'select', 'edit', 'remove', 'save');
            
            // Populate initial document list.
            documentList.fetch();
            docListView.render();
        },
        
        select: function(doc) {
            // No-op if already selected.
            if (this.selected == doc) {
                return;
            }
            
            
            // Auto-save on switching away from editor.
            if (this.editing) {
                this.save();
            }
            
            this.selected = doc;
            docEditView.hide();
            this.editing = false;
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
        edit: function() {
            if (this.selected) {
                docDisplayView.hide();
                docEditView.display(this.selected);
                docEditView.focus(false);
                this.editing = true;
            }
        },
        add: function() {
            var doc = documentList.create();
            this.select(doc);
            this.edit();
            docEditView.focus(true);
        },
        remove: function() {
            if (this.selected) {
                this.selected.destroy();
                this.selected = null;
                docDisplayView.hide();
                docEditView.hide();
                this.editing = false;
            }
        },
        save: function() {            
            if (!this.selected.set(docEditView.values())) {
                // Validation failed.
                return;
            }
            docEditView.hide();
            docDisplayView.display(this.selected);
            this.selected.save();
        },
        selectId: function(docId) {
            this.select(documentList.get(docId));
        }
    });
    window.app = new ARApp;
    Backbone.history.start(); // route the first hash
    
    // Disable selection on sidebar.
    $('#sidebar *').disableSelection();
    
});
