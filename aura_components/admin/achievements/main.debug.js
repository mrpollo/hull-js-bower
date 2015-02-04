this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/achievements/main"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n  <div class=\"well\">\n    <h2>Achievements for <strong>"
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.app)),stack1 == null || stack1 === false ? stack1 : stack1.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</strong></h2>\n    <table class=\"table table-hover\">\n      <thead>\n        <tr>\n          <td><strong>Name</strong></td>\n          <td><strong>Details</strong></td>\n          <td><strong></strong></td>\n        </tr>\n      </thead>\n      <tbody>\n        ";
  options={hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}
  if (helper = helpers.achievements) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.achievements); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.achievements) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  options={hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}
  if (helper = helpers.achievements) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.achievements); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.achievements) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </tbody>\n    </table>\n  </div>\n\n  <hr/>\n\n\n  <div class=\"well\">\n    <h2>Create an achievement</h2>\n    <form action=\"#\">\n      ";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.error), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"name\">Name</label>\n        <div class=\"controls\">\n          <input id=\"name\" type=\"text\" name=\"name\" class=\"input-block-level\" />\n        </div>\n      </div>\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"description\">Description</label>\n        <div class=\"controls\">\n          <textarea id=\"description\" name=\"description\" class=\"input-block-level\" rows=\"5\"></textarea>\n        </div>\n      </div>\n      <div class=\"control-group\">\n        <label class=\"control-label\" for=\"secret\">Secret</label>\n        <div class=\"controls\">\n          <input id=\"type\" type=\"text\" name=\"secret\" class=\"input-block-level\" />\n        </div>\n      </div>\n      <div class=\"form-actions\">\n        <button class=\"btn btn-primary\" type=\"submit\">Create</button>\n      </div>\n    </form>\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n        <tr>\n          <td>";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</td>\n          <td>\n            <small>\n              <ul>\n                <li> <strong>ID</strong>: <code>";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</code> </li>\n                <li> <strong>Description</strong>: ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " </li>\n                <li> <strong>Secret</strong>: ";
  if (helper = helpers.secret) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.secret); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + " </li>\n              </ul>\n            </small>\n          </td>\n          <td>\n            <a class='btn' data-hull-action=\"remove\" data-hull-achievement-id=\"";
  if (helper = helpers.id) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.id); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\" class=\"pull-right\">Delete</a>\n          </td>\n        </tr>\n        ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n        <tr>\n          <td colspan=5>\n            <div class=\"text-center muted\">\n              None\n            </div>\n          </td>\n        </tr>\n        ";
  }

function program6(depth0,data) {
  
  
  return "\n        <div class=\"alert\">\n          An error occured.\n        </div>\n      ";
  }

function program8(depth0,data) {
  
  
  return "\n  You need to be an administrator of the current app to view this component\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(8, program8, data),fn:self.noop,data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(8, program8, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/achievements@hull', {
    type: 'Hull',
    templates: ['main'],
    datasources: { achievements: 'app/achievements' },
    afterRender: function () {
        var that = this;
        $('form', this.el).on('submit', function (evt) {
            evt.preventDefault();
            var data = that._getFormData(this);
            that.createAchievement(data);
        });
    },
    createAchievement: function (data) {
        var promise = this.api.post('app/achievements', data);
        this._attachHandlers(promise);
    },
    deleteAchievement: function (data) {
        var promise = this.api(data.data.achievementId, 'delete');
        this._attachHandlers(promise);
    },
    actions: {
        remove: function (evt, data) {
            this.deleteAchievement(data);
        }
    },
    _getFormData: function (elt) {
        var data = {};
        this.sandbox.util._.each($(elt).serializeArray(), function (entry) {
            if (!entry.value)
                return;
            data[entry.name] = entry.value;
        });
        return data;
    },
    _attachHandlers: function (promise) {
        var that = this;
        promise.then(function () {
            that.refresh();
        }, function () {
            that.render('main', { error: true });
        });
    }
});