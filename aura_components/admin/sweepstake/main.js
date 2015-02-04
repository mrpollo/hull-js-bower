this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["admin/sweepstake/sweepstake"]=function(e,t,n,i,a){function l(e,t){var i,a="";return a+='\n  <div class="well">\n    <h2>Create a Sweepstake</h2>\n\n    <div class="control-group">\n      <label for="hull-instant-name">Name: </label>\n      <input class=\'input-block-level\' id="hull-instant-name" name="hull-instant-name" type="text"/>\n    </div>\n\n    <div class="control-group">\n      <label for="hull-instant-description">Description: optional</label>\n      <input class=\'input-block-level\' id="hull-instant-description" name="hull-instant-description" type="text"/>\n    </div>\n\n    <div class="control-group">\n      <label for="hull-instant-secret">Secret: optional</label>\n      <input class=\'input-block-level\' id="hull-instant-secret" name="hull-instant-secret" type="text"/>\n    </div>\n\n    <div class="control-group">\n      <button class="btn btn-primary" data-hull-action="create">Create</button>\n    </div>\n    \n  </div>\n\n  <hr/>\n\n  <div class="well">\n    <h2>Update Achievement</h2>\n\n    <div class="control-group">\n      <label for="hull-achievement-id">Select a Sweepstake to Edit: </label>\n      <select id="hull-achievement-id" name="hull-achievement-id">\n        ',i=n.each.call(e,e&&e.achievements,{hash:{},inverse:v.noop,fn:v.program(2,s,t),data:t}),(i||0===i)&&(a+=i),a+='\n      </select>\n    </div>\n\n    <div class="hull-instant-admin__section">\n      <div class="control-group">\n        <label for="hull-instant-update-name">Name: </label>\n        <input class=\'input-block-level\' id="hull-instant-update-name" name="hull-instant-update-name" type="text"/>\n      </div>\n\n      <div class="control-group">\n        <label for="hull-instant-update-id">ID (use this in your component): </label>\n        <code id="hull-instant-update-id" name="hull-instant-update-id" type="text"></code>\n      </div>\n\n      <div class="control-group">\n        <label for="hull-instant-update-description">Description: </label>\n        <input class=\'input-block-level\' id="hull-instant-update-description" name="hull-instant-update-description" type="text"/>\n      </div>\n\n      <div class="control-group">\n        <label for="hull-instant-update-secret">Secret: </label>\n        <input id="hull-instant-update-secret" name="hull-instant-update-secret" type="text"/>\n      </div>\n\n      <div class="control-group">\n        <button class="btn btn-primary" data-hull-action="updateAchievement">Update Achievement</button>\n      </div>\n    </div>\n  </div>\n\n  <div class="well">\n    <div class="control-group">\n      <label for="hull-prizes-json">Prizes JSON: </label>\n      <textarea class=\'input-block-level\' id="hull-prizes-json" name="hull-prizes-json" rows="20" cols="30"></textarea>\n    </div>\n\n    <div class="form-actions">\n      <button class="btn btn-primary" data-hull-action="updatePrizes">Update Prize</button>\n    </div>\n  </div>\n'}function s(e){var t,n="";return n+='\n          <option value="'+d((t=e&&e.id,typeof t===u?t.apply(e):t))+'">'+d((t=e&&e.name,typeof t===u?t.apply(e):t))+" - "+d((t=e&&e.id,typeof t===u?t.apply(e):t))+"</option>\n        "}function h(){return"\n  You need to be an administrator of the current app to view this component\n"}this.compilerInfo=[4,">= 1.0.0"],n=this.merge(n,e.helpers),a=a||{};var c,o,r,p="",u="function",d=this.escapeExpression,v=this,m=n.blockHelperMissing;return r={hash:{},inverse:v.noop,fn:v.program(1,l,a),data:a},(o=n.isAdmin)?c=o.call(t,r):(o=t&&t.isAdmin,c=typeof o===u?o.call(t,r):o),n.isAdmin||(c=m.call(t,c,{hash:{},inverse:v.noop,fn:v.program(1,l,a),data:a})),(c||0===c)&&(p+=c),p+="\n",r={hash:{},inverse:v.program(4,h,a),fn:v.noop,data:a},(o=n.isAdmin)?c=o.call(t,r):(o=t&&t.isAdmin,c=typeof o===u?o.call(t,r):o),n.isAdmin||(c=m.call(t,c,{hash:{},inverse:v.program(4,h,a),fn:v.noop,data:a})),(c||0===c)&&(p+=c),p+="\n"},Hull.component("admin/sweepstake@hull",{type:"Hull",templates:["sweepstake"],datasources:{achievements:function(){return this.api("app/achievements",this.signRequest({where:{_type:"InstantWin"}}))}},afterRender:function(){this.$appSecret=this.$el.find("#hull-app-secret"),this.$achievementsSelector=this.$el.find("#hull-achievement-id"),this.$achievementName=this.$el.find("#hull-instant-update-name"),this.$achievementId=this.$el.find("#hull-instant-update-id"),this.$achievementDescription=this.$el.find("#hull-instant-update-description"),this.$achievementSecret=this.$el.find("#hull-instant-update-secret"),this.$achievementPrizes=this.$el.find("#hull-prizes-json"),this.showAchievement(),this.$achievementsSelector.on("change",this.sandbox.util._.bind(this.showAchievement,this))},showAchievement:function(){var e=this.$achievementsSelector.val(),t=this.sandbox.util._.where(this.data.achievements,{id:e})[0];t&&(this.$achievementName.val(t.name),this.$achievementId.text(t.id),this.$achievementDescription.val(t.description),this.$achievementSecret.val(t.secret),this.api(e+"/prizes",this.signRequest()).then(this.sandbox.util._.bind(function(e){var t={prizes:this.sandbox.util._.map(e||[],function(e){return this.sandbox.util._.pick(e,"id","name","description","available_at","extra")})};this.$achievementPrizes.val(JSON.stringify(t,null,2))},this)))},signRequest:function(e){return this.sandbox.util._.extend(e||{},{access_token:this.appSecret})},actions:{create:function(e){e.preventDefault();var t=this.$el.find("#hull-instant-description").val(),n=this.$el.find("#hull-instant-secret").val(),i={type:"instant_win",name:this.$el.find("#hull-instant-name").val()};t.length&&(i.description=t),n.length&&(i.secret=n),this.api("app/achievements","post",this.signRequest(i)).done(this.sandbox.util._.bind(function(){alert("Sweepstake Created"),this.refresh()},this)).fail(function(){alert("Cannot create Sweepstake")})},updateAchievement:function(){var e=this.$achievementsSelector.val(),t=this.$achievementDescription.val(),n=this.$achievementSecret.val(),i={name:this.$achievementName.val()};t.length&&(i.description=t),n.length&&(i.secret=n),this.api(e,"put",this.signRequest(i)).done(function(){alert("Achievement Updated")}).fail(function(){alert("Ooops... Check the form...")})},updatePrizes:function(){var e;try{e=$.parseJSON(this.$achievementPrizes.val())}catch(t){alert("Invalid JSON")}var n=this.$achievementsSelector.val();this.api(n+"/prizes","put",this.signRequest(e)).done(function(){alert("Prizes updated!")}).fail(function(){alert("Ooops... check your JSON...")})},sign:function(){this.appSecret=this.$appSecret.val(),this.refresh()}}});