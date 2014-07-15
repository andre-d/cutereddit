var process_subreddit = function(i, data) {
    if (!data.data.header_img || !data.data.header_size) {
        return;
    }
    var sum = data.data.public_description.split('\n')[0]
    sum = $('<span>').html(sum).text();
    $logo = $('<div>')
    .addClass('header')
    .css('background-image', 'url("' + data.data.header_img + '")');
    $sr = $('<a>')
    .attr('href', 'http://www.reddit.com/r/' + data.data.display_name)
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
$.ajax('http://www.reddit.com/subreddits.json?limit=100',
       {
           dataType: 'json',
           success: process_subreddits
       }
)
})
