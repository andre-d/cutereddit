var reddit = 'http://www.reddit.com';
if (location.protocol == 'https:') {
    reddit = 'https://pay.reddit.com';
}

var if_https_rewrite = function(url) {
    if (location.protocol == 'https:') {
        return  'https://s3.amazonaws.com/' + url.split('://')[1]
    }
    return url;
}

var process_subreddit = function(i, data) {
    if (!data.data.header_img || !data.data.header_size) {
        return;
    }
    var sum = data.data.public_description.split('\n')[0]
    sum = $('<span>').html(sum).text();
    $logo = $('<div>')
    .addClass('header')
    .css('background-image', 'url("' + if_https_rewrite(data.data.header_img) + '")');
    $sr = $('<a>')
    .attr('href', reddit + '/r/' + data.data.display_name)
    .attr('title', sum)
    .append($logo)
    .addClass('sr')
    .append($('<span>').text('/r/' + data.data.display_name).addClass('name'))
    .appendTo($('#content'));
}

var process_subreddits = function(data) {
    $('#content').empty();
    $.each(data.data.children, process_subreddit);
}

$(function() {
$.ajax(reddit + '/subreddits.json?limit=100',
       {
           dataType: 'json',
           success: process_subreddits
       }
)
})
