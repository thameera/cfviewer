$(function() {

  var loadedOnce = false;
  var treeCollapsed = true;

  // Use large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  // Read a page's GET URL variables and return them as an associative array.
  var getUrlVars = function()
  {
    var vars = {}, hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    hashes.forEach(function(el, idx, arr){
      hash = arr[idx].split('=');
      vars[hash[0]] = hash[1];
    });

    return vars;
  }

  var setTweetCount = function(tree) {
    $('#tweetcount').html('<strong>Tweet count:</strong> ' + tree.length);
  };

  var setParticipants = function(participants) {
    var str = participants.map(function(p) {
      var link = '<a href ="https://twitter.com/' + p.name + '" target="_blank">' + p.name + '</a>';
      return link + '(' + p.count + ')'
    }).join(', ');
    $('#participants').html('<strong>Participants:</strong> ' + str);
  };

  var linkifyText = function(text, entity) {
    return text.replace(entity.url, '<a target="_blank" class="cfv text-url" href="' + entity.expanded_url + '">' + entity.display_url + '</a>');
  };

  // Get the twitter conversation given a tweet url and optionally usernames
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
      setTweetCount(res.tree);
      setParticipants(res.participants);

      // Prepare HTML for node text
      var tree = res.tree.map(function(node) {
        var text = node.text;
        node.url_entities.forEach(function(entity) {
          text = linkifyText(text, entity);
        });
        node.text = ' <em class="username"><a class="cfv" href="' + node.url + '">' + node.user + '</a></em>: ' + text;
        return node;
      });

      if (loadedOnce) {
        $('#tree').jstree(true).settings.core.data = tree;
        $('#tree').jstree(true).refresh();
      } else {
        $('#tree').jstree({ 'core' : {
          check_callback: true,
          data: tree
        }});
        loadedOnce = true;
      }

      // Bind clicks on tree nodes
      $('#tree').bind('ready.jstree open_node.jstree', function(e, data) {
        $('a.cfv').unbind('click').click(function(e) {
          // Find tweet's URL
          var url = $(e.target)[0].href;
          window.open(url, '_blank');
        });
      });

    });
  }

  // Pre-populate values from localStorage
  $('#tweet_url').val(localStorage.getItem('tweetUrl') || '');
  $('#usernames').val(localStorage.getItem('usernames') || '');

  var updateTree = function() {
    var tweetUrl = $('#tweet_url').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetUrl', tweetUrl);
    localStorage.setItem('usernames', usernames);

    var params = { 'tweeturl': tweetUrl, 'users': usernames}
    var str = jQuery.param( params );
    window.history.pushState('', '', '?' + str);

    getTweets(tweetUrl, usernames);
  }

  var urlVars = getUrlVars();
  if (urlVars['tweeturl']){
    var tweetUrl = urlVars['tweeturl'];
    if (urlVars['users']){
      var users = urlVars['users'].split("%20").join(' ');
    }

    $('#tweet_url').val( decodeURIComponent(tweetUrl) || '');
    $('#usernames').val(users || '');

    updateTree();
  }

  $('#view').click(function() {
    updateTree();
  });

  var toggleCollapse = function(){
    if(treeCollapsed){
      $('#tree').jstree('open_all');
      $('#toggleCollapse').html("-");
      $('#toggleCollapse').prop('title', 'Collapse tree');
      treeCollapsed = false;
    } else {
      $('#tree').jstree('close_all');
      $('#toggleCollapse').html("+");
      $('#toggleCollapse').prop('title', 'Expand tree');
      treeCollapsed = true;
    }
  }

  $('#toggleCollapse').click(function() {
    toggleCollapse();
  });

  // Bind Enter key press on text boxes
  $('#tweet_url, #usernames').keypress(function(e) {
    if (e.keyCode === 13) updateTree();
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
