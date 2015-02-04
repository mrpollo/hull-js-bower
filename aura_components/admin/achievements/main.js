this.Hull=this.Hull||{},this.Hull.templates=this.Hull.templates||{},this.Hull.templates._default=this.Hull.templates._default||{},Hull.templates._default["admin/achievements/main"]=function(n,e,t,a,l){function s(n,e){var a,l,s,c="";return c+='\n  <div class="well">\n    <h2>Achievements for <strong>'+u((a=n&&n.app,a=null==a||a===!1?a:a.name,typeof a===v?a.apply(n):a))+'</strong></h2>\n    <table class="table table-hover">\n      <thead>\n        <tr>\n          <td><strong>Name</strong></td>\n          <td><strong>Details</strong></td>\n          <td><strong></strong></td>\n        </tr>\n      </thead>\n      <tbody>\n        ',s={hash:{},inverse:f.noop,fn:f.program(2,i,e),data:e},(l=t.achievements)?a=l.call(n,s):(l=n&&n.achievements,a=typeof l===v?l.call(n,s):l),t.achievements||(a=g.call(n,a,{hash:{},inverse:f.noop,fn:f.program(2,i,e),data:e})),(a||0===a)&&(c+=a),c+="\n        ",s={hash:{},inverse:f.program(4,r,e),fn:f.noop,data:e},(l=t.achievements)?a=l.call(n,s):(l=n&&n.achievements,a=typeof l===v?l.call(n,s):l),t.achievements||(a=g.call(n,a,{hash:{},inverse:f.program(4,r,e),fn:f.noop,data:e})),(a||0===a)&&(c+=a),c+='\n      </tbody>\n    </table>\n  </div>\n\n  <hr/>\n\n\n  <div class="well">\n    <h2>Create an achievement</h2>\n    <form action="#">\n      ',a=t["if"].call(n,n&&n.error,{hash:{},inverse:f.noop,fn:f.program(6,o,e),data:e}),(a||0===a)&&(c+=a),c+='\n      <div class="control-group">\n        <label class="control-label" for="name">Name</label>\n        <div class="controls">\n          <input id="name" type="text" name="name" class="input-block-level" />\n        </div>\n      </div>\n      <div class="control-group">\n        <label class="control-label" for="description">Description</label>\n        <div class="controls">\n          <textarea id="description" name="description" class="input-block-level" rows="5"></textarea>\n        </div>\n      </div>\n      <div class="control-group">\n        <label class="control-label" for="secret">Secret</label>\n        <div class="controls">\n          <input id="type" type="text" name="secret" class="input-block-level" />\n        </div>\n      </div>\n      <div class="form-actions">\n        <button class="btn btn-primary" type="submit">Create</button>\n      </div>\n    </form>\n  </div>\n'}function i(n,e){var a,l,s="";return s+="\n        <tr>\n          <td>",(l=t.name)?a=l.call(n,{hash:{},data:e}):(l=n&&n.name,a=typeof l===v?l.call(n,{hash:{},data:e}):l),s+=u(a)+"</td>\n          <td>\n            <small>\n              <ul>\n                <li> <strong>ID</strong>: <code>",(l=t.id)?a=l.call(n,{hash:{},data:e}):(l=n&&n.id,a=typeof l===v?l.call(n,{hash:{},data:e}):l),s+=u(a)+"</code> </li>\n                <li> <strong>Description</strong>: ",(l=t.description)?a=l.call(n,{hash:{},data:e}):(l=n&&n.description,a=typeof l===v?l.call(n,{hash:{},data:e}):l),s+=u(a)+" </li>\n                <li> <strong>Secret</strong>: ",(l=t.secret)?a=l.call(n,{hash:{},data:e}):(l=n&&n.secret,a=typeof l===v?l.call(n,{hash:{},data:e}):l),s+=u(a)+' </li>\n              </ul>\n            </small>\n          </td>\n          <td>\n            <a class=\'btn\' data-hull-action="remove" data-hull-achievement-id="',(l=t.id)?a=l.call(n,{hash:{},data:e}):(l=n&&n.id,a=typeof l===v?l.call(n,{hash:{},data:e}):l),s+=u(a)+'" class="pull-right">Delete</a>\n          </td>\n        </tr>\n        '}function r(){return'\n        <tr>\n          <td colspan=5>\n            <div class="text-center muted">\n              None\n            </div>\n          </td>\n        </tr>\n        '}function o(){return'\n        <div class="alert">\n          An error occured.\n        </div>\n      '}function c(){return"\n  You need to be an administrator of the current app to view this component\n"}this.compilerInfo=[4,">= 1.0.0"],t=this.merge(t,n.helpers),l=l||{};var d,h,p,m="",v="function",u=this.escapeExpression,f=this,g=t.blockHelperMissing;return p={hash:{},inverse:f.noop,fn:f.program(1,s,l),data:l},(h=t.isAdmin)?d=h.call(e,p):(h=e&&e.isAdmin,d=typeof h===v?h.call(e,p):h),t.isAdmin||(d=g.call(e,d,{hash:{},inverse:f.noop,fn:f.program(1,s,l),data:l})),(d||0===d)&&(m+=d),m+="\n",p={hash:{},inverse:f.program(8,c,l),fn:f.noop,data:l},(h=t.isAdmin)?d=h.call(e,p):(h=e&&e.isAdmin,d=typeof h===v?h.call(e,p):h),t.isAdmin||(d=g.call(e,d,{hash:{},inverse:f.program(8,c,l),fn:f.noop,data:l})),(d||0===d)&&(m+=d),m+="\n"},Hull.component("admin/achievements@hull",{type:"Hull",templates:["main"],datasources:{achievements:"app/achievements"},afterRender:function(){var n=this;$("form",this.el).on("submit",function(e){e.preventDefault();var t=n._getFormData(this);n.createAchievement(t)})},createAchievement:function(n){var e=this.api.post("app/achievements",n);this._attachHandlers(e)},deleteAchievement:function(n){var e=this.api(n.data.achievementId,"delete");this._attachHandlers(e)},actions:{remove:function(n,e){this.deleteAchievement(e)}},_getFormData:function(n){var e={};return this.sandbox.util._.each($(n).serializeArray(),function(n){n.value&&(e[n.name]=n.value)}),e},_attachHandlers:function(n){var e=this;n.then(function(){e.refresh()},function(){e.render("main",{error:!0})})}});