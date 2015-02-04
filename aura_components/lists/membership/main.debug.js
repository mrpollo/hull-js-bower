this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["lists/membership/header"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class=\"new\">\n  <form>\n    <div class=\"input-append\">\n      <input name=\"name\" id=\"name\" class=\"input-medium\" type=\"text\"/>\n      <button class=\"btn\" href=\"#\" type=\"submit\">Create</button>\n    </div>\n  </form>\n</div>\n<ul class=\"lists nav nav-tabs nav-stacked\">\n</ul>\n\n";
  };
Hull.templates._default["lists/membership/items"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <li>\n    <a href=\"#\" data-hull-list-id='";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "'>\n      <span class=\"pull-right listed ";
  if (helper = helpers.cssClass) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.cssClass); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">✔</span>\n      <span>☰</span>\n      ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n    </a>\n  </li>\n";
  return buffer;
  }

  stack1 = helpers.each.call(depth0, (depth0 && depth0.elements), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  };
Hull.templates._default["lists/membership/loggedOut"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<ul>\n  <li>\n    <div data-hull-component=\"login/button@hull\"></div>\n  </li>\n</ul>\n";
  };
Hull.templates._default["lists/membership/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div data-hull-toggle class=\"btn btn-mini\">☰</div>\n";
  } ; 

Hull.component('lists/membership@hull', {
    type: 'Hull',
    templates: [
        'main',
        'items',
        'loggedOut',
        'header'
    ],
    refreshEvents: ['model.hull.me.change'],
    requiredOptions: ['id'],
    datasources: {
        lists: function () {
            'use strict';
            var _ = this.sandbox.util._;
            return !this.loggedIn() && [] || this.api('me/lists').then(function (data) {
                return _.map(data, function (list) {
                    return {
                        id: list.id,
                        name: list.name
                    };
                });
            });
        },
        listedIn: function () {
            'use strict';
            var _ = this.sandbox.util._;
            return !this.loggedIn() && true || this.api(this.options.id + '/listed_in').then(function (data) {
                return _.pluck(data, 'id');
            });
        }
    },
    initialize: function () {
        'use strict';
        if (!this.sandbox.util._.isFunction(this.$el.popover)) {
            throw new Error('The component ' + this.componentName + ' requires jQuery.popover.');
        }
    },
    afterRender: function () {
        'use strict';
        var _ = this.sandbox.util._;
        var btn = this.$el.find('[data-hull-toggle]');
        btn.popover({
            title: 'Add to List',
            html: true,
            placement: 'bottom',
            content: '',
            container: 'body'
        });
        btn.on('show', this.sandbox.util._.bind(this.renderPopover, this));
        this.sandbox.dom.find(document.body).on('click', _.bind(function (evt) {
            if (this.getContentTip().find(evt.target).length === 0 && btn.index(evt.target) === -1) {
                btn.popover('hide');
            }
        }, this));
    },
    'createList': function (listData) {
        'use strict';
        var _ = this.sandbox.util._;
        this.api.post('me/lists', listData).then(_.bind(function (list) {
            this.data.lists.unshift({
                id: list.id,
                name: list.name
            });
            this.addToList(list.id).then(_.bind(this.refreshElements, this));
            this.getContentTip().find('input').val('');
        }, this));
    },
    isItemInList: function (listId) {
        'use strict';
        return this.data.listedIn.indexOf(listId) > -1;
    },
    removeFromList: function (listId) {
        'use strict';
        var _ = this.sandbox.util._;
        return this.toggleIn(listId, 'del').then(_.bind(function () {
            this.data.listedIn = _.filter(this.data.listedIn, function (_listId) {
                return listId !== _listId;
            });
        }, this));
    },
    addToList: function (listId) {
        'use strict';
        var _ = this.sandbox.util._;
        return this.toggleIn(listId, 'add').then(_.bind(function () {
            this.data.listedIn.unshift(listId);
            this.data.listedIn = _.uniq(this.data.listedIn);
        }, this));
    },
    toggleIn: function (listId, action) {
        'use strict';
        var methods = {
                add: 'post',
                del: 'delete'
            };
        return this.api(listId + '/items/' + this.options.id, methods[action]);
    },
    renderPopover: function () {
        'use strict';
        var tip = this.getContentTip();
        var $popoverContent = tip.find('.popover-content');
        if (!this.loggedIn()) {
            $popoverContent.html(this.renderTemplate('loggedOut'));
        } else {
            var contents = this.renderTemplate('header', { id: this.id });
            $popoverContent.html(contents);
            this.refreshElements();
        }
        this.sandbox.start($popoverContent, { reset: true });
        var self = this;
        tip.on('click', '.lists a', function (evt, ctx) {
            evt.preventDefault();
            var _ = self.sandbox.util._;
            var listId = self.sandbox.dom.find(evt.currentTarget).data('hull-list-id');
            var method = self.isItemInList(listId) ? 'removeFromList' : 'addToList';
            var promise = self[method](listId);
            promise.then(_.bind(self.refreshElements, self));
        });
        tip.on('submit', 'form', function (evt) {
            evt.preventDefault();
            var formData = self.sandbox.dom.getFormData(evt.currentTarget);
            return self.createList(formData);
        });
    },
    refreshElements: function () {
        'use strict';
        var content = this.getContentTip();
        var $elts = content.find('.popover-content .lists');
        var _ = this.sandbox.util._;
        this.$find('input[type=text][name=name]').val('');
        _.each(this.data.lists, _.bind(function (list) {
            list.cssClass = this.isItemInList(list.id) ? '' : 'hidden';
        }, this));
        $elts.html(this.renderTemplate('items', { elements: this.data.lists }));
    },
    getContentTip: function () {
        return this.$el.find('[data-hull-toggle]').data('popover').tip();
    }
});