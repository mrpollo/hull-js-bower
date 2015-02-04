this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/user_profile/user_profile"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <div class=\"media user-header\">\n    ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.picture), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    <div class='media-body'>\n      <h4 class='media-heading'>\n        "
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n        <small class=\"muted\">"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</small>\n      </h4>\n\n      <div class=\"admin-infos\">\n        <dl>\n          ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.email), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.username), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  stack1 = helpers.each.call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.identities), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </dl>\n      </div>\n\n    </div>\n\n  </div>\n\n  <div class=\"row-fluid\">\n\n    <div class=\"cell-6\">\n\n      <div class=\"admin-infos admin-infos-permissions\">\n        <header>\n          <h5>Permissions</h5>\n        </header>\n        <dl>\n          <dt>Role:</dt>\n          <dd>\n            <div class=\"dropdown\">\n              <a href=\"#\" class=\"dropdown-toggle\" data-toggle=\"dropdown\">\n                ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.is_admin), {hash:{},inverse:self.program(15, program15, data),fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n                <span class=\"caret\"></span>\n              </a>\n              <ul class=\"dropdown-menu\">\n                <li><a href=\"#\" data-hull-action=\"promote\" data-hull-role=\"normal\">User</a></li>\n                <li><a href=\"#\" data-hull-action=\"promote\" data-hull-role=\"admin\">Admin</a></li>\n              </ul>\n            </div>\n          </dd>\n        </dl>\n      </div>\n\n    </div>\n\n    <div class=\"cell-6 admin-infos\">\n        <header>\n          <h5>Stats</h5>\n        </header>\n      ";
  stack1 = (helper = helpers.key_value || (depth0 && depth0.key_value),options={hash:{},inverse:self.noop,fn:self.program(17, program17, data),data:data},helper ? helper.call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.stats), options) : helperMissing.call(depth0, "key_value", ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.stats), options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    </div>\n\n  </div>\n\n  ";
  stack1 = helpers.unless.call(depth0, ((stack1 = (depth0 && depth0.org)),stack1 == null || stack1 === false ? stack1 : stack1['public']), {hash:{},inverse:self.noop,fn:self.program(19, program19, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.userHasProfiles), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.badges), {hash:{},inverse:self.noop,fn:self.program(28, program28, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <div class=\"pull-left\">\n        <img class='img-rounded' src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" width=\"50\" height=\"50\"/>\n      </div>\n    ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <dt>Email</dt>\n            <dd>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.email)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</dd>\n          ";
  return buffer;
  }

function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <dt>Username</dt>\n            <dd>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.username)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</dd>\n          ";
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n            <dt>"
    + escapeExpression((helper = helpers.humanize || (depth0 && depth0.humanize),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.provider), options) : helperMissing.call(depth0, "humanize", (depth0 && depth0.provider), options)))
    + ":</dt>\n            <dd>";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.login), {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</dd>\n          ";
  return buffer;
  }
function program9(depth0,data) {
  
  var stack1, helper;
  if (helper = helpers.login) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.login); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  return escapeExpression(stack1);
  }

function program11(depth0,data) {
  
  var stack1, helper;
  if (helper = helpers.email) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.email); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  return escapeExpression(stack1);
  }

function program13(depth0,data) {
  
  
  return "\n                  Admin\n                ";
  }

function program15(depth0,data) {
  
  
  return "\n                  User\n                ";
  }

function program17(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n        <dl>\n          <dt>"
    + escapeExpression((helper = helpers.humanize || (depth0 && depth0.humanize),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.key), options) : helperMissing.call(depth0, "humanize", (depth0 && depth0.key), options)))
    + "</dt>\n          <dd>"
    + escapeExpression((helper = helpers.json || (depth0 && depth0.json),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.value), options) : helperMissing.call(depth0, "json", (depth0 && depth0.value), options)))
    + "</dd>\n        </dl>\n      ";
  return buffer;
  }

function program19(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"admin-infos admin-infos-approve\">\n      ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.approved), {hash:{},inverse:self.program(22, program22, data),fn:self.program(20, program20, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program20(depth0,data) {
  
  
  return "\n        <button class=\"btn btn-block\" data-hull-action=\"unapprove\">Unapprove</button>\n      ";
  }

function program22(depth0,data) {
  
  
  return "\n        <button class=\"btn btn-block\" data-hull-action=\"approve\">Approve</button>\n      ";
  }

function program24(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h3>Profiles</h3>\n    <div class=\"admin-infos\">\n      ";
  stack1 = helpers.each.call(depth0, ((stack1 = (depth0 && depth0.user)),stack1 == null || stack1 === false ? stack1 : stack1.profiles), {hash:{},inverse:self.noop,fn:self.program(25, program25, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  ";
  return buffer;
  }
function program25(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <header>\n          <h5>"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ":</h5>\n        </header>\n        <dl>\n          ";
  stack1 = helpers.each.call(depth0, depth0, {hash:{},inverse:self.noop,fn:self.program(26, program26, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </dl>\n      ";
  return buffer;
  }
function program26(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n            <dt>"
    + escapeExpression(((stack1 = (data == null || data === false ? data : data.key)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + ":</dt>\n            <dd>"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</dd>\n          ";
  return buffer;
  }

function program28(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <h3>Badges</h3>\n  ";
  options={hash:{},inverse:self.noop,fn:self.program(29, program29, data),data:data}
  if (helper = helpers.badges) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.badges); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.badges) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(29, program29, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }
function program29(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n  <div class=\"admin-infos\">\n    <header>\n      <h5>\n        <small class=\"pull-right\">\n          <a class=\"btn-link\" data-hull-action=\"deleteBadge\" data-hull-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n            <i class=\"icon-trash\"></i> delete\n          </a>\n        </small>\n        [";
  if (helper = helpers.achievement_type) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.achievement_type); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "] ";
  if (helper = helpers.achievement_name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.achievement_name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n      </h5>\n    </header>\n    <dl>\n      <dt>created_at:</dt>\n      <dd>";
  if (helper = helpers.created_at) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.created_at); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n      <dt>updated_at:</dt>\n      <dd>";
  if (helper = helpers.updated_at) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.updated_at); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n      <dt>Score:</dt>\n      <dd>";
  if (helper = helpers.score) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.score); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n      <dt>Best Score:</dt>\n      <dd>";
  if (helper = helpers.best_score) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.best_score); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</dd>\n      <dt># attempts:</dt>\n      <dd>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.stats)),stack1 == null || stack1 === false ? stack1 : stack1.attempts)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</dd>\n    </dl>\n  </div>\n  ";
  return buffer;
  }

function program31(depth0,data) {
  
  
  return "\n  <div class=\"admin-empty text-center\">\n    <div class=\"admin-empty-wrapper\">\n      <span class=\"admin-empty-icon\">&#9785;</span>\n      <h4>User not found</h4>\n    </div>\n  </div>\n";
  }

  stack1 = helpers['if'].call(depth0, (depth0 && depth0.user), {hash:{},inverse:self.program(31, program31, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/user_profile@hull', {
    type: 'Hull',
    templates: ['user_profile'],
    datasources: {
        user: function () {
            if (this.options.id) {
                return this.api({
                    provider: 'admin@' + this.options.namespace,
                    path: this.options.id
                }, { fields: 'user.profiles' });
            }
        },
        badges: function () {
            if (this.options.id) {
                return this.api({
                    provider: 'admin@' + this.options.namespace,
                    path: this.options.id + '/badges'
                });
            }
        }
    },
    initialize: function () {
        this.sandbox.on('hull.user.select', this.renderUser, this);
    },
    beforeRender: function (data) {
        if (!data.user) {
            return;
        }
        data.userHasProfiles = !this.sandbox.util._.isEmpty(data.user.profiles);
    },
    actions: {
        promote: function (e, action) {
            this.promoteUser(action.data.role);
        },
        approve: function () {
            var self = this;
            this.api(this.data.user.id + '/approve', 'post').then(function () {
                self.render();
            });
        },
        unapprove: function () {
            var self = this;
            this.api(this.data.user.id + '/unapprove', 'post').then(function () {
                self.render();
            });
        },
        deleteBadge: function (e, action) {
            var self = this;
            if (confirm('Sure ?')) {
                this.api({
                    path: action.data.id,
                    provider: 'admin@' + this.options.namespace
                }, 'delete', function (res) {
                    self.render();
                });
            }
        }
    },
    renderUser: function (id) {
        var displayedUser = this.data.user;
        if (displayedUser && displayedUser.id === id) {
            return;
        }
        this.options.id = id;
        this.user = id;
        this.render();
    },
    promoteUser: function (role) {
        var method = role === 'admin' ? 'post' : 'delete';
        var self = this;
        this.api({
            provider: 'admin@' + this.options.namespace,
            path: 'admins/' + this.data.user.id
        }, method).then(function () {
            self.render();
        });
    }
});