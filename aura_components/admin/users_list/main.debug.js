this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/users_list/forbidden"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<h1>You are not authorized to list users...</h1>\n";
  };
Hull.templates._default["admin/users_list/users_list"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"btn-group pull-right users-filters\" data-toggle=\"buttons-radio\">\n    ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.filters), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n      <button type=\"button\" class=\"btn btn-small ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isActive), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-hull-action=\"";
  if (helper = helpers.action) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.action); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</button>\n    ";
  return buffer;
  }
function program3(depth0,data) {
  
  
  return "active";
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<p><small>Result for: <strong>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.currentQuery)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</strong>. <a href=\"#\" data-hull-action=\"resetSearch\">clear</a></small></p>\n";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<ul class=\"nav nav-tabs nav-stacked list list-user\">\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.users), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n";
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <li>\n      <a href=\"#\" data-hull-action=\"selectUser\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n          <div class=\"media\">\n            ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.picture), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n            <div class=\"media-body\">\n              <h5 class=\"media-heading\">\n                <span class=\"name\">";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span>\n                ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.email), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n              </h5>\n\n              <ul class=\"unstyled\">\n                <li><strong>Created: </strong>"
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.created_at), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.created_at), options)))
    + "</li>\n                ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.username), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.identities), {hash:{},inverse:self.noop,fn:self.program(15, program15, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                <li class=\"sign-in-count\"><strong>Sign in count: </strong>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.stats)),stack1 == null || stack1 === false ? stack1 : stack1.sign_in_count)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</li>\n              </ul>\n\n            </div>\n          </div>\n          <i class=\"icon-chevron-right\"></i>\n        </a>\n    </li>\n  ";
  return buffer;
  }
function program9(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n              <div class=\"pull-left\">\n                <img src=\"";
  if (helper = helpers.picture) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.picture); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" width=\"50\" height=\"50\"/>\n              </div>\n            ";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += " <small class=\"email\">";
  if (helper = helpers.email) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.email); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</small> ";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "<li><strong>Username:</strong> ";
  if (helper = helpers.username) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.username); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</li>";
  return buffer;
  }

function program15(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n                  <li class=\"provider\"><strong>Provider: </strong>\n                    ";
  options={hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data}
  if (helper = helpers.identities) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.identities); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.identities) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                  </li>\n                ";
  return buffer;
  }
function program16(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n                      <i class=\"icon-";
  if (helper = helpers.type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\"></i> "
    + escapeExpression((helper = helpers.humanize || (depth0 && depth0.humanize),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.type), options) : helperMissing.call(depth0, "humanize", (depth0 && depth0.type), options)))
    + "\n                    ";
  return buffer;
  }

function program18(depth0,data) {
  
  
  return "\n  <p class=\"m2 muted text-center\">There is no user that match your criteria</p>\n";
  }

function program20(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <p>\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showPreviousButton), {hash:{},inverse:self.noop,fn:self.program(21, program21, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showNextButton), {hash:{},inverse:self.noop,fn:self.program(23, program23, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </p>\n";
  return buffer;
  }
function program21(depth0,data) {
  
  
  return "\n      <button data-hull-action='previousPage' class=\"btn\">← Previous</button>\n    ";
  }

function program23(depth0,data) {
  
  
  return "\n      <button data-hull-action='nextPage' class=\"btn\">Next →</button>\n    ";
  }

  buffer += "<div class=\"btn-group pull-right\">\n  <a class=\"btn btn-small dropdown-toggle\" data-toggle=\"dropdown\" href=\"#\">\n    Sort by <span class=\"caret\"></span>\n  </a>\n  <ul class=\"dropdown-menu\">\n    <li><a href=\"#\" data-hull-action=\"sort\" data-hull-field=\"created_at\" data-hull-direction=\"desc\">Created At</a></li>\n    <li><a href=\"#\" data-hull-action=\"sort\" data-hull-field=\"name\">Name</a></li>\n    <li><a href=\"#\" data-hull-action=\"sort\" data-hull-field=\"email\">Email</a></li>\n    <li><a href=\"#\" data-hull-action=\"sort\" data-hull-field=\"stats.sign_in_count\" data-hull-direction=\"desc\">Sign In Count</a></li>\n  </ul>\n</div>\n\n";
  stack1 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.org)),stack1 == null || stack1 === false ? stack1 : stack1['public']), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n<form class=\"form form-search js-hull-users-search\">\n  <input type=\"text\" class=\"js-hull-users-search-query\" placeholder=\"Search by email\" value=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.currentQuery)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <button type=\"submit\" class=\"btn\">Search</button>\n</form>\n\n";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.currentQuery)),stack1 == null || stack1 === false ? stack1 : stack1.email), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.users), {hash:{},inverse:self.program(18, program18, data),fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.showPagination), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/users_list@hull', {
    type: 'Hull',
    templates: ['users_list'],
    refreshEvents: ['model.hull.me.change'],
    renderError: function (err) {
        if (err.message.status === 401) {
            this.html('You are not authorized to list users');
        }
    },
    datasources: {
        users: {
            provider: 'admin@:namespace',
            path: 'users'
        }
    },
    initialize: function () {
        this.query = {};
        this.currentQuery = {};
    },
    beforeRender: function (data) {
        var datasource = this.datasources.users;
        data.showPagination = datasource.isPaginable();
        data.showNextButton = !datasource.isLast();
        data.showPreviousButton = !datasource.isFirst();
        data.currentQuery = this.currentQuery;
        data.filters = {
            All: {
                action: 'resetFilter',
                isActive: this.query.approved == null
            },
            Approved: {
                action: 'filterApproved',
                isActive: this.query.approved === true
            },
            Unapproved: {
                action: 'filterUnapproved',
                isActive: this.query.approved === false
            }
        };
    },
    afterRender: function () {
        var $searchForm = this.$('.js-hull-users-search');
        $searchForm.on('submit', this.sandbox.util._.bind(function (e) {
            e.preventDefault();
            this.search($searchForm.find('.js-hull-users-search-query').val());
        }, this));
    },
    actions: {
        nextPage: function () {
            var datasource = this.datasources.users;
            if (!datasource.isLast()) {
                datasource.next();
                this.render();
            }
        },
        previousPage: function () {
            var datasource = this.datasources.users;
            if (!datasource.isFirst()) {
                datasource.previous();
                this.render();
            }
        },
        selectUser: function (event, action) {
            this.sandbox.emit('hull.user.select', action.data.id);
        },
        sort: function (event, action) {
            this.sort(action.data.field, action.data.direction);
        },
        resetSearch: function () {
            delete this.query.email;
            this.filter();
        },
        resetFilter: function () {
            delete this.query.approved;
            this.filter();
        },
        filterApproved: function () {
            this.query.approved = true;
            this.filter();
        },
        filterUnapproved: function () {
            this.query.approved = false;
            this.filter();
        }
    },
    sort: function (field, direction) {
        this.datasources.users.sort(field, direction);
        this.render();
    },
    filter: function () {
        if (this.queryHasChanged()) {
            this.datasources.users.where(this.query);
            this.render();
            this.currentQuery = this.sandbox.util._.clone(this.query);
        }
    },
    queryHasChanged: function () {
        var _ = this.sandbox.util._;
        if (_.isEmpty(this.query) && _.isEmpty(this.currentQuery)) {
            return false;
        }
        if (_.size(this.query) !== _.size(this.currentQuery)) {
            return true;
        }
        return !this.sandbox.util._.every(this.query, function (v, k) {
            return this.currentQuery[k] === v;
        }, this);
    },
    search: function (email) {
        var query;
        if (!this.sandbox.util._.string.isBlank(email)) {
            this.query.email = email;
        } else {
            delete this.query.email;
        }
        this.filter();
    }
});