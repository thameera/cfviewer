$(function() {

  // User large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  $('#view').click(function() {
    $('#loading').show();
    var tweetId = $('#tweet_id').val();
    var usernames = $('#usernames').val();

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
