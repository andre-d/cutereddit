var CuteReddit = {
    route: {},
    init: function() {
        CuteReddit.SubredditList.init()
        this.nav(window.location.hash.substring(1))
        $('body').on('click', 'a', function(e) {
            var href = $(this).attr('href')
            if (href && href[0] == '#') {
                e.preventDefault()
                CuteReddit.nav(this.href.split('#')[1])
            } else {
                this.target = '_blank'
            }
        })
        window.onpopstate = $.proxy(this.nav_changed, this)
    },
    nav_changed: function() {
        history.replaceState(undefined, undefined, '#' + this.current_location())
        if (this.current_nav != this.current_location()) {
            this.current_nav = this.current_location()
            if (this.current_nav) {
                CuteReddit.SubredditList.add_by_name(this.current_nav, true)
            }
        }
    },
    current_location: function() {
        var location = window.location.hash.substring(1)
        return this.Utils.norm_path(location)
    },
    nav: function(where) {
        where = this.Utils.norm_path(where)
        if (this.current_location() != where) {
            history.pushState(undefined, undefined, '#' + where)
        }
        this.nav_changed()
    }
}

CuteReddit.SubredditButton = function(sr, name) {
    this.init(sr, name);
}

CuteReddit.SubredditButton.prototype = {
    init: function(sr, name) {
        this.sr = sr
        name = name ? name : sr.display_name
        var tall = false
        var url = CuteReddit.Utils.make_reddit_url('/static/reddit.com.header.png')
        if (this.sr.header_img && this.sr.header_size) {
            url = CuteReddit.Utils.reddit_cdn_url(sr.header_img)
            tall = this.sr.header_size[1] > this.sr.header_size[0]
        }
        var sum = this.sr.public_description.split('\n')[0]
        sum = $('<span>').html(sum).text()
        
        $logo = $('<div>')
            .addClass('header')
            .css('background-image', 'url("' + url + '")')
        if (tall) {
            $logo.addClass('tall')
        }
        this.$el = $('<a>')
            .attr('href', '#' + sr.url)
            .attr('title', sum)
            .append($logo)
            .addClass('sr')
            .append($('<span>').text(name).addClass('name'))
    }
}

CuteReddit.ContentView = {
    comment_classes: ["first", "second", "third", "fourth"],
    init: function(path, context) {
        this.path = path
        this.$el = $('#content')
        this.$el.addClass('loading')
        this.context = context
        CuteReddit.Utils.ajax(
            path + '.json'
        ).done($.proxy(this.render_page, this))
    },
    add_embed: function(link, data) {
        if (!data.html) {
            return
        }
        link.embed_data = data;
        link.$em.find('img').attr('src', data.thumbnail_url)
    },
    add_obj: function(data, parent) {
        if (data.kind == 't3') {
            var link = data.data
            var url = link.is_self ? '#' + link.permalink : link.url;
            var $link = $('<div>').addClass('link')
            var $outerlink = $('<div>').addClass('outerlink')
            link.$em = $outerlink
            
            var $status = $('<div>').addClass('status')
            var $score = $('<span>').addClass('score').appendTo($status)
           
            var $comments = $('<a>').addClass('comments').appendTo($status)
            $status.appendTo($outerlink)
            
            $outerlink.append($link)
            
            var media_url = link.url
            var thumbnail_url
            if (media_url.indexOf('http://i.imgur.com') == 0 || media_url.indexOf('http://imgur.com') == 0) {
                media_url = CuteReddit.Utils.imgur_rewrite(media_url)
                if (media_url.indexOf('https://imgur.com/gallery/') != 0) {
                    thumbnail_url = media_url.replace('http://', 'http://i.') + 'b.jpg'
                }
            }
            
            var $thumb = $('<a>').addClass('thumb').appendTo($link)
            var $img = $('<img>')
            $thumb.append($('<div>').append($img).addClass('imgwrap')).attr('href', url)
            if (link.secure_media && link.secure_media.oembed && link.secure_media.oembed.thumbnail_url) {
                var url = link.secure_media.oembed.thumbnail_url.replace("&amp;", "&")
                $img.attr('src', url)
            } else if (thumbnail_url) {
                $img.attr('src', thumbnail_url)
            } else if (link.thumbnail && link.thumbnail.lastIndexOf('http', 0) == 0) {
                $img.attr('src', CuteReddit.Utils.reddit_cdn_url(link.thumbnail))
            } else {
                var img = link.is_self ? 'self_default2.png' : 'noimage.png'
                $img.attr('src', CuteReddit.Utils.make_reddit_url('/static/' + img))
            }
            
            var $title = $('<a>').addClass('title').appendTo($link)
            $title.attr('href', url).text(link.title)
            $comments.text('comments ' + link.num_comments).attr('href', '#' + link.permalink)
            $score.text('score ' + link.score)

            if (!link.secure_media) {
                CuteReddit.Utils.ajax('https://noembed.com/embed', {
                    data: {
                        'url': media_url
                    }
                }, true).done($.proxy(this.add_embed, this, link))
            }
            
            if(this.type != 'listing' && link.is_self) {
                var html = $('<div>').html(link.selftext_html).text()
                $outerlink.append($('<div>').addClass('selftext').html(html))
            }

            $('#content_body').append($outerlink)
        }else if (data.kind == 't1') {
            var comment = data.data
            var $link = $('<div>').addClass('link')
            var $outerlink = $('<div>').addClass('outerlink').addClass('comment')
            
            $outerlink.addClass(this.comment_classes[this.n_comment % this.comment_classes.length])
            
            comment.$em = $outerlink
            
            var $status = $('<div>').addClass('status')
            var $score = $('<span>').addClass('score').appendTo($status)
           
            $status.appendTo($outerlink)
            
            $outerlink.append($link)
            
            $score.text('score ' + comment.score)
            
            var html = $('<div>').html(comment.body_html).text()
            $outerlink.append($('<div>').addClass('selftext').html(html))
            
            if (parent) {
                parent = $('<div>').addClass('nest').insertAfter(parent)
                parent.append($outerlink)
            } else {
                $('#content_body').append($outerlink)
            }

            var add = $.proxy(this.add_obj, this)
            if (comment.replies) {
                this.n_comment += 1
                $.each(comment.replies.data.children.reverse(), function(i, data) {
                    add(data, $outerlink);
                })
                this.n_comment -= 1
            }
        }
    },
    render_page: function(data) {
        this.$el.scrollTop(0);
        this.n_comment = 0
        $('#context_header').empty();
        $('#content_body').empty()
        $('#context_header').append(new CuteReddit.SubredditButton(this.context, this.path).$el)
        var add = $.proxy(this.add_obj, this)
        this.type = data.data ? 'listing' : 'comments'
        var datas = data.data ? [data] : data
        $.each(datas, function(i, data) {
            $.each(data.data.children, function(i, data) {add(data)})
        })
        this.$el.removeClass('loading')
    }
}

CuteReddit.SubredditList = {
    initial_complete: 1,
    subreddits: {},
    init: function() {
        this.$el = $('#srlist')
        CuteReddit.Utils.ajax(
            'subreddits.json',
            {data: {limit: 10}}
        ).done($.proxy(this.init_list, this))
    },
    nav_to: function(path) {
        var sr = path.split('/r/')[1].split('/')[0]
        this.$el.find('li').removeClass('selected')
        sr = this.subreddits[sr.toLowerCase()]
        sr.button.$el.parent().addClass('selected')
        if (CuteReddit.ContentView.path != path) {
            CuteReddit.ContentView.init(path, sr)
        }
    },
    add_by_name: function(path, nav_to) {
        name = path.split('/r/')[1].split('/')[0]
        if (this.subreddits[name.toLowerCase()]) {
            if (nav_to) {
                this.nav_to(path)
            }
            return
        }
        $('#sidebar').addClass('loading')
        this.initial_complete += 1
        nav_to = nav_to ? path : false
        CuteReddit.Utils.ajax(
            '/r/' + name + '/about.json'
        ).done($.proxy(this.add_from_response, this, nav_to))
    },
    add_from_response: function(nav_to, data) {
        this.add(data.data, nav_to)
        this.initial_complete -= 1
        if (this.initial_complete <= 0) {
            $('#sidebar').removeClass('loading')
        }
    },
    add: function(sr, nav_to, initial) {
        if(!this.subreddits[sr.display_name.toLowerCase()]) {
            var button = new CuteReddit.SubredditButton(sr)
            if (initial) {
                this.$el.append($('<li>').append(button.$el))
            } else {
                this.$el.prepend($('<li>').append(button.$el))
            }
            sr.button = button
            this.subreddits[sr.display_name.toLowerCase()] = sr
        }
        if (nav_to) {
            this.nav_to(nav_to)
        }
    },
    init_list: function(data) {
        var add = $.proxy(this.add, this);
        $.each(data.data.children, function(i, data) {
            add(data.data, false, true)
        })
        $('#sidebar').removeClass('loading')
        if (!CuteReddit.current_nav) {
            CuteReddit.nav(data.data.children[0].data.url)
        }
        this.initial_complete -= 1
    }
}

CuteReddit.Utils = {
    make_reddit_url: function(url) {
        if (url[0] != '/') {
            url = '/' + url;
        }
        var reddit = 'http://www.reddit.com'
        if (location.protocol == 'https:') {
            reddit = 'https://pay.reddit.com'
        }
        return reddit + url
    },
    imgur_rewrite: function(path) {
        /* TODO: REGEX */
        path = path.replace('/a/', '/gallery/')
        path = path.split('imgur.com/')
        path = path.length > 1 ? path[1] : path[0]
        if (path.slice(-4)[0] == '.') {
            path = path.slice(0, -4)
        }
        path = path.split('?')[0]
        // Modern thumbnail link
        if (path.length == 8 || path.length == 6) {
            path = path.slice(0, - 1)
        }
        return 'https://imgur.com/' + path 
    },
    norm_path: function(path) {
        if (path.substr(-1) == '/') {
            path = path.substr(0, path.length - 1)
        }
        return path
    },
    reddit_cdn_url: function(url) {
        if (location.protocol == 'https:') {
            return 'https://' + url.split('://')[1]
        }
        return url
    },
    ajax: function(url, options, jsonp) {
        if (!jsonp) {
            url = this.make_reddit_url(url)
        }
        return $.ajax(
            url,
            $.extend(
                options,
                {
                    dataType: jsonp ? 'jsonp' : 'json'
                }
            )
        )
    }
}

$($.proxy(CuteReddit.init, CuteReddit))
