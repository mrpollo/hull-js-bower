this.Hull = this.Hull || {};
this.Hull.templates = this.Hull.templates || {};
this.Hull.templates._default = this.Hull.templates._default || {};
Hull.templates._default["activity/feed/feed"]=function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this, blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data,depth1) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n    <li class=\"media hull-activity__";
  if (helper = helpers.verb) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.verb); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n      ";
  stack1 = helpers['if'].call(depth0, ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      <div class=\"media-body\">\n        <h5 class=\"media-heading\">\n          "
    + escapeExpression((helper = helpers.to_s || (depth0 && depth0.to_s),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.actor), options) : helperMissing.call(depth0, "to_s", (depth0 && depth0.actor), options)))
    + " "
    + escapeExpression((helper = helpers.activity || (depth1 && depth1.activity),options={hash:{},data:data},helper ? helper.call(depth0, (depth1 && depth1.map), depth0, options) : helperMissing.call(depth0, "activity", (depth1 && depth1.map), depth0, options)))
    + " "
    + escapeExpression((helper = helpers.to_s || (depth0 && depth0.to_s),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.target), options) : helperMissing.call(depth0, "to_s", (depth0 && depth0.target), options)))
    + "\n        </h5>\n        ";
  options={hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data}
  if (helper = helpers.object) { stack1 = helper.call(depth0, options); }
  else { helper = (depth0 && depth0.object); stack1 = typeof helper === functionType ? helper.call(depth0, options) : helper; }
  if (!helpers.object) { stack1 = blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data}); }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <p class=\"muted\">"
    + escapeExpression((helper = helpers.fromNow || (depth0 && depth0.fromNow),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.published), options) : helperMissing.call(depth0, "fromNow", (depth0 && depth0.published), options)))
    + "</p>\n      </div>\n      </div>\n    </li>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <div class=\"pull-left\">\n          <img class=\"media-object img-rounded\" src=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.actor)),stack1 == null || stack1 === false ? stack1 : stack1.picture)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"/>\n        </div>\n      ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "", stack1, helper, options;
  buffer += "\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "image", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "image", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "comment", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "comment", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n          ";
  stack1 = (helper = helpers.ifEqual || (depth0 && depth0.ifEqual),options={hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data},helper ? helper.call(depth0, (depth0 && depth0.type), "review", options) : helperMissing.call(depth0, "ifEqual", (depth0 && depth0.type), "review", options));
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "", helper, options;
  buffer += "\n            <img src=\""
    + escapeExpression((helper = helpers.imageUrl || (depth0 && depth0.imageUrl),options={hash:{},data:data},helper ? helper.call(depth0, (depth0 && depth0.id), "original", options) : helperMissing.call(depth0, "imageUrl", (depth0 && depth0.id), "original", options)))
    + "\"/>\n          ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <p>";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</p>\n          ";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "", stack1, helper;
  buffer += "\n            <p> <span class=\"label\">";
  if (helper = helpers.rating) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.rating); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</span> ";
  if (helper = helpers.description) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.description); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</p>\n          ";
  return buffer;
  }

function program11(depth0,data) {
  
  
  return "\n    <li>\n      <div class=\"alert\">No activity</div>\n    </li>\n  ";
  }

function program13(depth0,data) {
  
  
  return "\n  <ul class=\"pager\">\n    <li class=\"previous\">\n      <a href=\"#\" data-hull-action=\"previousPage\">&larr; Previous</a>\n    </li>\n    <li class=\"next\">\n      <a href=\"#\" d data-hull-action=\"nextPage\">Next &rarr;</a>\n    </li>\n  </ul>\n";
  }

function program15(depth0,data) {
  
  
  return "\n  <button data-hull-action=\"fetchMore\" class=\"btn btn-block\">Fetch more...</button>\n";
  }

  buffer += "<ul class=\"hull-activity media-list\">\n  ";
  stack1 = helpers.each.call(depth0, (depth0 && depth0.activities), {hash:{},inverse:self.noop,fn:self.programWithDepth(1, program1, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  stack1 = helpers.unless.call(depth0, (depth0 && depth0.activities), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</ul>\n\n\n";
  stack1 = helpers['if'].call(depth0, (depth0 && depth0.isPaged), {hash:{},inverse:self.program(15, program15, data),fn:self.program(13, program13, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n";
  return buffer;
  } ; 

Hull.component('activity/feed@hull', {
    type: 'Hull',
    templates: ['feed'],
    options: {
        perPage: 10,
        page: 1
    },
    map: {
        fallback: {
            verb: {
                receive: 'received',
                share: 'shared',
                add: 'added',
                post: 'posted',
                like: 'liked',
                unlike: 'unliked',
                review: 'reviewed',
                create: 'created'
            },
            object: {
                entity: 'an entity',
                image: 'an image',
                status: 'a status',
                photo: 'a picture',
                question: 'a question',
                item: 'an object',
                badge: 'a badge',
                link: 'a link',
                video: 'a video',
                note: 'a note',
                comment: 'a comment',
                review: 'a review'
            },
            target: {
                facebook_app: 'Facebook',
                twitter_app: 'Twitter'
            }
        },
        create: {
            review: 'reviewed',
            comment: 'posted a comment on'
        }
    },
    datasources: {
        activities: function () {
            var path, id = this.id || 'app';
            if (this.options.friendsOnly) {
                path = id + '/friends_activity';
            } else {
                path = id + '/activity';
            }
            return this.api(path, this.query);
        }
    },
    actions: {
        nextPage: function () {
            this.query.skip = undefined;
            this.query.limit = this.options.limit || this.options.perPage;
            this.query.page = this.query.page || 1;
            this.query.page += 1;
            this.render();
            return false;
        },
        previousPage: function () {
            this.query.skip = undefined;
            this.query.limit = this.options.limit || this.options.perPage;
            this.query.page = this.query.page || 1;
            if (this.query.page > 1) {
                this.query.page -= 1;
                this.render();
            }
            return false;
        },
        fetchMore: function (e, params) {
            params.el.text('Loading...');
            var originalLimit = this.options.limit || this.options.perPage;
            this.query.limit += originalLimit;
            this.render();
        }
    },
    initialize: function () {
        var query = {};
        if (this.options.startPage) {
            query.page = this.options.startPage;
        } else {
            query.skip = this.options.skip || 0;
        }
        query.limit = this.options.limit || this.options.perPage;
        query.where = this.options.where || {};
        if (this.options.verb) {
            query.where.verb = this.options.verb;
        }
        if (this.options.object_type) {
            query.where.obj_type = this.options.object_type;
        }
        var ObjectIdRegexp = /^[0-9a-f]{24}/i;
        if (this.options.after) {
            var after = this.options.after;
            if (ObjectIdRegexp.test(after)) {
                query.where._id = { '$gte': after };
            } else if (moment(after).isValid()) {
                query.where.created_at = { '$gte': moment(after).toDate() };
            }
        } else if (this.options.before) {
            var before = this.options.before;
            if (ObjectIdRegexp.test(before)) {
                query.where._id = { '$lte': before };
            } else if (moment(before).isValid()) {
                query.where.created_at = { '$lte': moment(before).toDate() };
            }
        }
        this.query = query;
    },
    beforeRender: function (data) {
        data.map = this.map;
        data.isPaged = this.options.navigation === 'paged';
        data.query = this.query;
        console.log(data);
        return data;
    }
});