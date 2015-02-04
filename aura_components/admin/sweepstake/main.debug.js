this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["admin/sweepstake/sweepstake"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, options, functionType="function", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"well\">\n    <h2>Create a Sweepstake</h2>\n\n    <div class=\"control-group\">\n      <label for=\"hull-instant-name\">Name: </label>\n      <input class='input-block-level' id=\"hull-instant-name\" name=\"hull-instant-name\" type=\"text\"/>\n    </div>\n\n    <div class=\"control-group\">\n      <label for=\"hull-instant-description\">Description: optional</label>\n      <input class='input-block-level' id=\"hull-instant-description\" name=\"hull-instant-description\" type=\"text\"/>\n    </div>\n\n    <div class=\"control-group\">\n      <label for=\"hull-instant-secret\">Secret: optional</label>\n      <input class='input-block-level' id=\"hull-instant-secret\" name=\"hull-instant-secret\" type=\"text\"/>\n    </div>\n\n    <div class=\"control-group\">\n      <button class=\"btn btn-primary\" data-hull-action=\"create\">Create</button>\n    </div>\n    \n  </div>\n\n  <hr/>\n\n  <div class=\"well\">\n    <h2>Update Achievement</h2>\n\n    <div class=\"control-group\">\n      <label for=\"hull-achievement-id\">Select a Sweepstake to Edit: </label>\n      <select id=\"hull-achievement-id\" name=\"hull-achievement-id\">\n        ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.achievements), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </select>\n    </div>\n\n    <div class=\"hull-instant-admin__section\">\n      <div class=\"control-group\">\n        <label for=\"hull-instant-update-name\">Name: </label>\n        <input class='input-block-level' id=\"hull-instant-update-name\" name=\"hull-instant-update-name\" type=\"text\"/>\n      </div>\n\n      <div class=\"control-group\">\n        <label for=\"hull-instant-update-id\">ID (use this in your component): </label>\n        <code id=\"hull-instant-update-id\" name=\"hull-instant-update-id\" type=\"text\"></code>\n      </div>\n\n      <div class=\"control-group\">\n        <label for=\"hull-instant-update-description\">Description: </label>\n        <input class='input-block-level' id=\"hull-instant-update-description\" name=\"hull-instant-update-description\" type=\"text\"/>\n      </div>\n\n      <div class=\"control-group\">\n        <label for=\"hull-instant-update-secret\">Secret: </label>\n        <input id=\"hull-instant-update-secret\" name=\"hull-instant-update-secret\" type=\"text\"/>\n      </div>\n\n      <div class=\"control-group\">\n        <button class=\"btn btn-primary\" data-hull-action=\"updateAchievement\">Update Achievement</button>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"well\">\n    <div class=\"control-group\">\n      <label for=\"hull-prizes-json\">Prizes JSON: </label>\n      <textarea class='input-block-level' id=\"hull-prizes-json\" name=\"hull-prizes-json\" rows=\"20\" cols=\"30\"></textarea>\n    </div>\n\n    <div class=\"form-actions\">\n      <button class=\"btn btn-primary\" data-hull-action=\"updatePrizes\">Update Prize</button>\n    </div>\n  </div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <option value=\""
    + escapeExpression(((stack1 = (depth0 && depth0.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = (depth0 && depth0.name)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " - "
    + escapeExpression(((stack1 = (depth0 && depth0.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</option>\n        ";
  return buffer;
  }

function program4(depth0,data) {
  
  
  return "\n  You need to be an administrator of the current app to view this component\n";
  }

  options={hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  options={hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}
  if (helper = helpers.isAdmin) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.isAdmin); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.isAdmin) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.program(4, program4, data),fn:self.noop,data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  } ; 

Hull.component('admin/sweepstake@hull', {
    type: 'Hull',
    templates: ['sweepstake'],
    datasources: {
        achievements: function () {
            return this.api('app/achievements', this.signRequest({ where: { _type: 'InstantWin' } }));
        }
    },
    afterRender: function () {
        this.$appSecret = this.$el.find('#hull-app-secret');
        this.$achievementsSelector = this.$el.find('#hull-achievement-id');
        this.$achievementName = this.$el.find('#hull-instant-update-name');
        this.$achievementId = this.$el.find('#hull-instant-update-id');
        this.$achievementDescription = this.$el.find('#hull-instant-update-description');
        this.$achievementSecret = this.$el.find('#hull-instant-update-secret');
        this.$achievementPrizes = this.$el.find('#hull-prizes-json');
        this.showAchievement();
        this.$achievementsSelector.on('change', this.sandbox.util._.bind(this.showAchievement, this));
    },
    showAchievement: function () {
        var id = this.$achievementsSelector.val();
        var achievement = this.sandbox.util._.where(this.data.achievements, { id: id })[0];
        if (achievement) {
            this.$achievementName.val(achievement.name);
            this.$achievementId.text(achievement.id);
            this.$achievementDescription.val(achievement.description);
            this.$achievementSecret.val(achievement.secret);
            this.api(id + '/prizes', this.signRequest()).then(this.sandbox.util._.bind(function (res) {
                var code = {
                        prizes: this.sandbox.util._.map(res || [], function (p) {
                            return this.sandbox.util._.pick(p, 'id', 'name', 'description', 'available_at', 'extra');
                        })
                    };
                this.$achievementPrizes.val(JSON.stringify(code, null, 2));
            }, this));
        }
    },
    signRequest: function (data) {
        return this.sandbox.util._.extend(data || {}, { access_token: this.appSecret });
    },
    actions: {
        create: function (e) {
            e.preventDefault();
            var description = this.$el.find('#hull-instant-description').val();
            var secret = this.$el.find('#hull-instant-secret').val();
            var data = {
                    type: 'instant_win',
                    name: this.$el.find('#hull-instant-name').val()
                };
            if (description.length) {
                data.description = description;
            }
            if (secret.length) {
                data.secret = secret;
            }
            this.api('app/achievements', 'post', this.signRequest(data)).done(this.sandbox.util._.bind(function (res) {
                alert('Sweepstake Created');
                this.refresh();
            }, this)).fail(function () {
                alert('Cannot create Sweepstake');
            });
        },
        updateAchievement: function () {
            var id = this.$achievementsSelector.val();
            var description = this.$achievementDescription.val();
            var secret = this.$achievementSecret.val();
            var data = { name: this.$achievementName.val() };
            if (description.length) {
                data.description = description;
            }
            if (secret.length) {
                data.secret = secret;
            }
            this.api(id, 'put', this.signRequest(data)).done(function () {
                alert('Achievement Updated');
            }).fail(function () {
                alert('Ooops... Check the form...');
            });
        },
        updatePrizes: function () {
            var prizes;
            try {
                prizes = $.parseJSON(this.$achievementPrizes.val());
            } catch (error) {
                alert('Invalid JSON');
            }
            var id = this.$achievementsSelector.val();
            this.api(id + '/prizes', 'put', this.signRequest(prizes)).done(function () {
                alert('Prizes updated!');
            }).fail(function () {
                alert('Ooops... check your JSON...');
            });
        },
        sign: function () {
            this.appSecret = this.$appSecret.val();
            this.refresh();
        }
    }
});