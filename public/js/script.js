$(function() {

  // Pre-populate values from localStorage
  $('#tweet_id').val(localStorage.getItem('tweetId') || '');
  $('#usernames').val(localStorage.getItem('usernames') || '');

  // User large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  $('#view').click(function() {
    $('#loading').show();
    var tweetId = $('#tweet_id').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetId', tweetId);
    localStorage.setItem('usernames', usernames);

    $.post('/get', {
      tweetId: tweetId,
      usernames: usernames
    }, function(data) {
      console.log(data);
      $('#loading').hide();
      $('#tree').jstree({ 'core' : data });
    });
  });

});
