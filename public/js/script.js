$(function() {

  $('#view').click(function() {
    var tweetId = $('#tweet_id').val();
    var usernames = $('#usernames').val();

    $.post('/get', {
      tweetId: tweetId,
      usernames: usernames
    }, function(data) {
      console.log(data);
      $('#tree').jstree({ 'core' : data });
    });
  });

});
