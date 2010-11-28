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

window.Paper = Backbone.Model.extend({
    defaults: {
        'description': 'new paper',
        'link': '',
        'tags': [],
        'read': false,
        'added': null,
        'readDate': null
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
        if (typeof(attrs.link) == 'string') {
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

window.PaperList = Backbone.Collection.extend({
    model: Paper,
    url: '/papers'
});
window.paperList = new PaperList;


// Paper list views.

window.PaperItemView = Backbone.CollectionItemView.extend({
    tagName: "li",
    template: _.template($('#paperlistitem-template').html()),
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

window.PaperListView = Backbone.CollectionView.extend({
    collection: paperList,
    itemView: PaperItemView,
    
    el: $('#paperlist'),
    events: {
        "click": "unselect"
    },
    unselect: function(e) {
        app.select(null);
    },
    
    didSelect: function(view) {
        // Scroll the selected item into view.
        var itemTop = $(view.el).position().top;
        var itemBottom = itemTop + $(view.el).outerHeight();
        var windowTop = this.el.scrollTop();
        var windowBottom = windowTop + this.el.innerHeight();
        if (itemTop < windowTop || itemBottom > windowBottom) {
            $(view.el).each(function() {
                if (this.scrollIntoView) {
                    this.scrollIntoView();
                }
            });
        }
    }
});
window.paperListView = new PaperListView;


// Paper display/edit views.

var HideShowView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'display', 'hide');
    },
    display: function(paper) {
        this.el.html(this.template(paper.flatten()));
        this.el.show();
    },
    hide: function() {
        this.el.hide();
    }
});

window.PaperDisplayView = HideShowView.extend({
    el: $('#paperdisplay'),
    template: _.template($('#paperdisplay-template').html()),
    events: {
        "click button.readToggle": 'readToggle'
    },
    readToggle: function(e) {
        app.readToggle();
    }
});
window.paperDisplayView = new PaperDisplayView;

window.PaperEditView = HideShowView.extend({
    el: $('#paperedit'),
    template: _.template($('#paperedit-template').html()),
    events: {
        "submit": "submit"
    },
    display: function(paper) {
        HideShowView.prototype.display.call(this, paper);
        _.bindAll(this, 'error');
        paper.bind('error', this.error);
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
        
        // Checkbox value.
        if (attrs['read']) {
            attrs['read'] = true;
        } else {
            attrs['read'] = false;
        }
        
        return attrs;
    },
    error: function(model, error) {
        // Mark invalid fields.
        this.$('input').removeClass('invalid');
        _.each(error, function(field) {
            this.$('input.' + field).addClass('invalid');
        });
    },
    focus: function(newPaper) {
        this.$('.description').focus();
    }
});
window.paperEditView = new PaperEditView;


// Source list.

var SOURCE_ALL = 0;
var SOURCE_UNREAD = 1;
var SOURCE_READ = 2;
window.SourceListView = Backbone.View.extend({
    el: $('#sourcelist'),
    selected: null,
    options: [],
    initialize: function() {
        _.bindAll(this, 'itemClick');
        this.$('li').live('click', this.itemClick);
        
        this.clear();
        this.add('All', SOURCE_ALL);
        this.add('Unread', SOURCE_UNREAD);
        this.add('Read', SOURCE_READ);
    },
    clear: function() {
        this.el.empty();
        this.options = [];
    },
    add: function(title, value) {
        this.el.append('<li>' + title + '</li>');
        this.options.push(value);
    },
    select: function(source) {
        this.selected = source;
        
        this.$('li').removeClass('selected');
    
        var idx = this.options.indexOf(source);
        this.$('li').eq(idx).addClass('selected');
    },
    itemClick: function(e) {
        var idx = this.$('li').index(e.currentTarget);
        app.setSource(this.options[idx]);
    }
});
window.sourceListView = new SourceListView;


// The toolbar controls.

window.ToolbarView = Backbone.View.extend({
    el: $('#toolbar'),
    events: {
        "click #addBtn": "addPaper",
        "click #removeBtn": "removePaper",
        "click #editBtn": "editPaper"
    },
    addPaper: function(e) {
        app.add();
    },
    removePaper: function(e) {
        app.remove();
    },
    editPaper: function(e) {
        app.edit();
    }
});
window.toolbarView = new ToolbarView;


// The splash/login screen.

window.SplashView = Backbone.View.extend({
    el: $('#splash'),
    events: {
        "click #openidSelect li a": 'choose',
        "submit #openidEnter": 'submit'
    },
    initialize: function() {
        this.$('#openidEnter').hide();
        _.bindAll(this, 'choose', 'submit');
        
        // Link titles.
        $('#openidSelect li a').each(function() {
            $(this).attr('title', $('img', this).attr('alt'));
        });
    },
    
    urls: {
        'Google': 'https://www.google.com/accounts/o8/id',
        'Flickr': 'http://flickr.com/USERNAME/',
        'Yahoo': 'http://yahoo.com/'
    },
    urlEnterLabel: 'Enter your OpenID:',
    usernameEnterLabel: 'Enter your username for SITE:',
    curSite: null,
    
    show: function() {
        this.el.show();
    },
    
    choose: function(e) {
        var site = $(e.currentTarget).attr('rel');
        if (site == 'OpenID') {
            // Special case: raw OpenID.
            this.$('#openidEnter label').text(this.urlEnterLabel);
            this.$('#openidEnter').show();
            this.$('#openidEnter input.username').focus();
            this.curSite = 'OpenID';
        } else {
            var url = this.urls[site];
            if (url.indexOf('USERNAME') == -1) {
                // No username in URL.
                this.$('#openidEnter').hide();
                app.login(url);
            } else {
                // Username in URL.
                var msg = this.usernameEnterLabel;
                msg = msg.replace('SITE', site);
                this.$('#openidEnter label').text(msg);
                this.$('#openidEnter').show();
                this.$('#openidEnter input.username').focus();
                this.curSite = site;
            }
        }
        return false;
    },
    submit: function(e) {
        var username = this.$('input.username').val();
        var url;
        if (this.curSite == 'OpenID') {
            url = username;
        } else {
            var url = this.urls[this.curSite];
            url = url.replace('USERNAME', username);
        }
        
        app.login(url);
        return false;
    }
});
window.splashView = new SplashView;


// Principal controller.

window.ARApp = Backbone.Controller.extend({
    selected: null,
    selectedId: null, // for selections before models are loaded
    editing: false,
    routes: {
        "papers/:pid": "selectId"
    },
    initialize: function() {
        _.bindAll(this, 'select', 'edit', 'remove', 'save',
                        'ajaxError', 'selectId', 'reselectId');
        
        // Populate initial paper list.
        paperList.fetch({
            error: this.ajaxError,
            success: this.reselectId
        });
    },
    
    ajaxError: function(obj, xhr, status, thrown) {
        if (xhr.status == 403) {
            // Show login splash.
            splashView.show();
        } else {
            console.log(status);
            alert(status); //TODO
        }
    },
    
    select: function(paper, force) {
        // No-op if already selected.
        if (!force && this.selected == paper) {
            return;
        }
        
        // Auto-save on switching away from editor.
        if (this.editing) {
            this.save();
        }
        
        this.selected = paper;
        paperEditView.hide();
        this.editing = false;
        if (this.selected) {
            if (paper.isNew()) {
                paperListView.setSelection(null);
            } else {
                paperListView.setSelection(this.selected);
                this.saveLocation('papers/' + this.selected.id);
            }
            paperDisplayView.display(this.selected);
        } else {
            paperListView.setSelection(null);
            paperDisplayView.hide();
            this.saveLocation('');
        }
    },
    edit: function() {
        if (this.selected) {
            paperDisplayView.hide();
            paperEditView.display(this.selected);
            paperEditView.focus(false);
            this.editing = true;
        }
    },
    add: function() {
        var paper = new Paper;
        this.select(paper);
        this.edit();
        paperEditView.focus(true);
    },
    remove: function() {
        if (this.selected) {
            if (this.selected.isNew()) {
                // Do nothing?
            } else {
                this.selected.destroy();
            }
            this.selected = null;
            paperDisplayView.hide();
            paperEditView.hide();
            this.editing = false;
        }
    },
    save: function() {            
        if (!this.selected.set(paperEditView.values())) {
            // Validation failed.
            return;
        }
        paperEditView.hide();
        paperDisplayView.display(this.selected);
        this.editing = false;
        
        if (this.selected.isNew()) {
            // A new paper. Add instead of modifying.
            paperList.add(this.selected);
            this.selected.save({}, {success: function(paper) {
                app.select(paper, true);
            }});
        } else {
            this.selected.save();
        }
    },
    
    readToggle: function() {
        if (this.selected) {
            this.selected.set({read: !this.selected.get('read')});
            paperDisplayView.display(this.selected);
            this.selected.save();
        }
    },
    
    setSource: function(source) {
        console.log(source);
        sourceListView.select(source);
    },
    
    // Log in with a given OpenID identity.
    login: function(identity) {
        var target = '/login/' + escape(identity);
        window.location.href = target;
    },
    
    // For hash URLs.
    selectId: function(paperId) {
        this.selectedId = paperId;
        this.select(paperList.get(paperId));
    },
    reselectId: function() {
        if (this.selectedId) {
            this.selectId(this.selectedId);
        }
    }
});
window.app = new ARApp;
Backbone.history.start(); // route the first hash


// Disable selection on sidebar.
$('#items *').disableSelection();
    
});
