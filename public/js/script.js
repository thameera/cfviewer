$(function() {

  // Pre-populate values from localStorage
  $('#tweet_url').val(localStorage.getItem('tweetUrl') || '');
  $('#usernames').val(localStorage.getItem('usernames') || '');

  // User large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  $('#view').click(function() {
    $('#loading').show();
    var tweetUrl = $('#tweet_url').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetUrl', tweetUrl);
    localStorage.setItem('usernames', usernames);

    $.post('/get', {
      tweetUrl: tweetUrl,
      usernames: usernames
    }, function(data) {
      console.log(data);
      $('#loading').hide();
      $('#tree').jstree({ 'core' : data });
    });
  });

  $('#clear').click(function() {
    $('#tweet_url').val('');
    $('#usernames').val('');
  });

});
