$(function() {
    
    // Models.
    
    window.Article = Backbone.Model.extend({
        initialize: function() {
            if (!this.get("title")) {
                this.set(
                    {'title': 'No Title Yet'}
                );
            }
        }
    });
    
    
    // Collections.
    
    window.ArticleList = Backbone.Collection.extend({
        model: Article,
        localStorage: new Store("articles"),
        comparator : function(article) {
            return article.get('title');
        }
    });
    
    window.Articles = new ArticleList;
    
    
    // Views.
    
    window.ArticleView = Backbone.View.extend({
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
            var article = Articles.create({'title': 'my title'});
            var view = new ArticleView({model: article});
            $('#doclist').append(view.render().el);
        }
    });
    
    window.App = new ToolbarView;
    
});


