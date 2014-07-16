var CuteReddit = {
    route: {},
    init: function() {
        CuteReddit.SubredditList.init()
        this.nav(window.location.hash.substring(1))
        $('body').on('click', 'a.sr', function(e) {
            e.preventDefault()
            CuteReddit.nav(this.href.split('#')[1])
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

CuteReddit.SubredditButton = function(sr) {
    this.init(sr);
}

CuteReddit.SubredditButton.prototype = {
    init: function(sr) {
        this.sr = sr
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
            .append($('<span>').text(sr.display_name).addClass('name'))
    }
}

CuteReddit.ContentView = {
    init: function(url, context) {
        this.$el = $('#content')
        this.$el.addClass('loading')
        this.context = context
        CuteReddit.Utils.ajax(
            url + '.json'
        ).done($.proxy(this.render_page, this))
    },
    add_obj: function(data) {
        if (data.kind == 't3') {
            var link = data.data;
            var $link = $('<div>').addClass('link')
            
            
            if (link.thumbnail && link.thumbnail.lastIndexOf('http', 0) == 0) {
                var $thumb = $('<a>').addClass('thumb').appendTo($link)
                $thumb.append($('<img>').attr('src', CuteReddit.Utils.reddit_cdn_url(link.thumbnail))).attr('href', link.url)
            }
            
            
            var $score = $('<span>').addClass('score').appendTo($link)
           
            var $comments = $('<span>').addClass('comments').appendTo($link)
            var $title = $('<span>').append($('<a>')).addClass('title').appendTo($link)
            $title.attr('href', '#' + link.permalink).find('a').append($('<span>').text(link.title))
            $comments.append($('<label>').text('comments')).append($('<div>').text(link.num_comments))
            $score.append($('<label>').text('score')).append($('<div>').text(link.score))
            $('#content_body').append($link)
        }
    },
    render_page: function(data) {
        this.$el.scrollTop(0);
        $('#context_header').empty();
        $('#content_body').empty()
        $('#context_header').append(new CuteReddit.SubredditButton(this.context).$el)
        var add = $.proxy(this.add_obj, this)
        $.each(data.data.children, function(i, data) {add(data)})
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
    nav_to: function(name) {
        this.$el.find('li').removeClass('selected')
        var sr = this.subreddits[name.toLowerCase()]
        sr.button.$el.parent().addClass('selected')
        if (CuteReddit.ContentView.context != sr) {
            CuteReddit.ContentView.init(sr.url, sr)
        }
    },
    add_by_name: function(name, nav_to) {
        name = name.split('/r/')[1]
        if (this.subreddits[name.toLowerCase()]) {
            if (nav_to) {
                this.nav_to(name)
            }
            return
        }
        $('#sidebar').addClass('loading')
        this.initial_complete += 1
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
            this.nav_to(sr.display_name)
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
    norm_path: function(path) {
        if (path.substr(-1) == '/') {
            path = path.substr(0, path.length - 1)
        }
        return path
    },
    reddit_cdn_url: function(url) {
        if (location.protocol == 'https:') {
            return 'https://s3.amazonaws.com/' + url.split('://')[1]
        }
        return url
    },
    ajax: function(url, options) {
        var url = this.make_reddit_url(url)
        return $.ajax(
            url,
            $.extend(
                options,
                {
                    dataType: 'json'
                }
            )
        )
    }
}

$($.proxy(CuteReddit.init, CuteReddit))
