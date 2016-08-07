$(function() {

  var loadedOnce = false;

  // Use large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  // Read a page's GET URL variables and return them as an associative array.
  function getUrlVars()
  {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  }

  // Get the tweitter conversation given a tweet url and optionally usernames
  var getTweets = function(tweetUrl, usernames){
    $('#error').hide();
    $('#loading').show();
    $.post('/api/get-tweets', {
      tweetUrl: decodeURIComponent(tweetUrl),
      usernames: usernames
    }, function(res) {
      if (typeof res === 'string') {
        $('#error').show();
        $('#loading').hide();
        return;
      }

      $('#loading').hide();
      $('#info').show();
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
  }

  var urlVars = getUrlVars();
  if (urlVars['tweeturl']){
    var users = '';
    var tweeturl = urlVars['tweeturl'];
    if (urlVars['users']){
      var users = urlVars['users'].split(",").join(' ');
    }

    getTweets(tweeturl, users);
  }

  // Pre-populate values from localStorage
  $('#tweet_url').val(localStorage.getItem('tweetUrl') || '');
  $('#usernames').val(localStorage.getItem('usernames') || '');

  $('#view').click(function() {
    var tweetUrl = $('#tweet_url').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetUrl', tweetUrl);
    localStorage.setItem('usernames', usernames);

    var params = { 'tweeturl': tweetUrl, 'users': usernames.split(',').join(' ')}
    var str = jQuery.param( params );
    window.history.pushState('', '', str);

    getTweets(tweetUrl, usernames);
  });

  // Bind Enter key press on text boxes
  $('#tweet_url, #usernames').keypress(function(e) {
    if (e.keyCode === 13) getTweets();
  });

  // Select text on click
  $('#tweet_url, #usernames').click(function() {
    this.select();
  });

  $('#clear').click(function() {
    $('#tweet_url').val('');
    $('#usernames').val('');
  });
});
