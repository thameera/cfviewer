$(function() {

  var loadedOnce = false;
  var treeCollapsed = true;

  // Use large version of jstree
  $.jstree.defaults.core.themes.variant = "large";

  var setUsernamesVisibility = function(show) {
    if (show) {
      $('#usernames-container').show();
    } else {
      $('#usernames-container').hide();
    }
  };

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
      return link + '<sup>' + p.count + '</sup>'
    }).join(', ');
    $('#participants').html('<strong>Participants:</strong> ' + str);
  };

  var linkify = function(text, url_entities, media_entities) {
    // Usernames
    text = text.replace(/(^|\s|“|\.|")@(\w+)/g, '$1<a target="_blank" class="cfv text-url" href="https://twitter.com/$2">@$2</a>');
    // Hashtags
    text = text.replace(/(^|\s)#([^\u0000-\u007F]+|\w+)/g, '$1<a target="_blank" class="cfv text-url" href="https://twitter.com/hashtag/$2">#$2</a>');
    // URLs
    url_entities.forEach(function(entity) {
      text = text.replace(entity.url, '<a target="_blank" class="cfv text-url" href="' + entity.expanded_url + '">' + entity.display_url + '</a>');
    });
    media_entities.forEach(function(entity) {
      text = text.replace(entity.url, '<a class="cfv text-url media" media-url="' + entity.media_url + '">' + entity.display_url + '</a>');
    });

    return text;
  };

  // Left-pad to two digits
  var pad = function(n) {
    return ('0' + n).substr(-2);
  };

  var getLKTimestamp = function(epoch) {
    var t = new Date(epoch);
    var date = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    var h = t.getHours();
    var time = (h > 12 ? h%12 : h) + ':' + pad(t.getMinutes()) + (h > 12 ? 'pm' : 'am');
    return date + ' ' + time;
  };

  var getTweetSuccessCb = function(res) {
    if (typeof res === 'string') {
      return showError();
    }

    $('#loading').hide();
    $('#content').css({visibility: 'visible'});
    setTweetCount(res.tree);
    setParticipants(res.participants);

    // Prepare HTML for node text
    var tree = res.tree.map(function(node) {
      var text = linkify(node.text, node.url_entities, node.media_entities);
      var timestamp = getLKTimestamp(node.epoch);
      node.text = ' <em class="username"><a class="cfv" href="' + node.url + '" title="' + timestamp + '">' + node.user + '</a></em>: ' + text;
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
  };

  var showError = function() {
    $('#error').show();
    $('#loading').hide();
  };

  // Get the twitter conversation given a tweet url and optionally usernames
  var getTweets = function(tweetUrl, usernames){
    $('#error').hide();
    $('#loading').show();
    $.post('/api/get-tweets', {
      tweetUrl: decodeURIComponent(tweetUrl),
      usernames: usernames
    })
      .done(getTweetSuccessCb)
      .fail(showError);
  };

  // Bind clicks on tree nodes
  $('#tree').bind('ready.jstree open_node.jstree redraw.jstree', function(e, data) {

    // Open external links
    $('a.cfv').unbind('click').click(function(e) {
      // Find tweet's URL
      var url = $(e.target)[0].href;
      window.open(url, '_blank');
    });

    // Show image
    $('a.media').unbind('click').click(function(e) {
      var url = $(e.target).attr('media-url');
      $('<img />', {
        src: url,
        style: 'max-width: 500px; max-height: 500px'
      }).one('load', function() {
        $.colorbox({html: $(this)});
      });
    });

    // Time tooltip
    $('em a').tooltipster({
      side: 'bottom',
      delay: [100, 100],
      debug: false,
      contentAsHTML: true
    });

    // Render twemoji
    twemoji.parse(document.body);
  });

  // Pre-populate values from localStorage
  $('#tweet_url').val(localStorage.getItem('tweetUrl') || '');
  var usernames = localStorage.getItem('usernames');
  $('#usernames').val(usernames || '');
  if (usernames) {
    setUsernamesVisibility(true);
  }

  var updateTree = function() {
    var tweetUrl = $('#tweet_url').val();
    var usernames = $('#usernames').val();
    localStorage.setItem('tweetUrl', tweetUrl);
    localStorage.setItem('usernames', usernames);

    if (!tweetUrl || !tweetUrl.trim()) return;

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

    $('#tweet_url').val(decodeURIComponent(tweetUrl) || '');
    $('#usernames').val(users || '');
    if (users) {console.log('dd'); setUsernamesVisibility(true);}

    updateTree();
  }

  var initTreeState = function() {
      treeCollapsed = true;
      $('#toggleCollapse').html("+");
      $('#toggleCollapse').prop('title', 'Expand tree');
  };

  $('#search').click(function() {
    initTreeState();
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
    if (e.keyCode === 13) {
      initTreeState();
      updateTree();
    }
  });

  // Select text on click
  $('#tweet_url, #usernames').click(function() {
    this.select();
  });

  $('#advanced').click(function() {
    // Toggle visibility
    setUsernamesVisibility(!$('#usernames-container').is(':visible'));
  });

  $('.tooltip').tooltipster({
    side: 'right',
    delay: [100, 100],
    debug: false
  });

  var $help = $('#help');
  var $helpInst = $help.tooltipster({contentAsHTML: true, maxWidth: 600}).tooltipster('instance');
  $helpInst.disable();
  $helpInst.on('after', function() {$helpInst.disable();});
  $help.click(function() {
    $helpInst.enable();
    $helpInst.open();
    $helpInst.content('<br>CFViewer 😽 makes reading Twitter 🐦 conversations easy by drawing them in a tree 🌳 view.<br><br>This is especially useful when conversations have branches 🌿, which can be a pain 🔫 to read in most Twitter clients. 👌<br><br><strong>How to use: ☝️</strong><br>Simply enter the URL of the top-most tweet in the conversation and press Enter. 😻<br>Click on the little arrows ▶️ to expand the replies<br><br>It picks up quoted tweets too, but only sometimes 😿. If you see some missing, try entering the usernames of some tweeps in those tweets in the second textbox.<br><br>Easily share a conversation by sharing the CFViewer URL. 👯<br><br><strong>Limitations 🙅</strong><br>CFViewer can only fetch conversations happened within the last couple of days. 📆<br>Conversations of popular international tweeps 🌟 might not be picked up.<br>Protected accounts break the tree 🐳. Please don\'t do that. 🙏<br><br>');
    twemoji.parse(document.body);
  });

  // Render twemoji
  twemoji.parse(document.body);
});
