$(function() {

  var loadedOnce = false;

  // Pre-populate values from localStorage
  $('#tweet_url').val(localStorage.getItem('tweetUrl') || '');
  $('#usernames').val(localStorage.getItem('usernames') || '');

  // User large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  // Select text on click
  $('#tweet_url, #usernames').click(function() {
    this.select();
  });

  $('#view').click(function() {
    $('#loading').show();
    $('#error').hide();
    var tweetUrl = $('#tweet_url').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetUrl', tweetUrl);
    localStorage.setItem('usernames', usernames);

    $.post('/get', {
      tweetUrl: tweetUrl,
      usernames: usernames
    }, function(res) {
      if (typeof res === 'string') {
        $('#error').show();
        $('#loading').hide();
        return;
      }

      $('#loading').hide();
      if (loadedOnce) {
        $('#tree').jstree(true).settings.core.data = res.data;
        $('#tree').jstree(true).refresh();
      } else {
        $('#tree').jstree({ 'core' : {
          check_callback: true,
          data: res.data
        }});
        loadedOnce = true;
      }

      // Bind click on profile pic
      $('#tree').bind('ready.jstree open_node.jstree', function(e, data) {
        $('i.jstree-themeicon').unbind('click').click(function(e) {
          // Get ID of selected tweet
          var id =$(e.target).parent().attr('id').split('_')[0]
          // Find tweet's URL
          var url = res.data.filter(function(t) {return t.id === id})[0].url;
          window.open(url,'_blank');
        });
      });

    });

  });

  $('#clear').click(function() {
    $('#tweet_url').val('');
    $('#usernames').val('');
  });

});
