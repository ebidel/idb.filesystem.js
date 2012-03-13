function onError(e) {
  ok(false, 'unexpected error ' + e.name);
  start();
};


module('window methods', {
  setup: function() {
    if (document.location.protocol == 'file:') {
      ok(false, 'These tests need to be run from a web server over http://.');
    }
  },
  teardown: function() {

  }
});

test('requestFileSystem', 10, function() {
  ok(window.requestFileSystem, 'window.requestFileSystem defined');
  equals(window.TEMPORARY, 0);
  equals(window.PERSISTENT, 1);

  stop();
  window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
    equals(fs.name, 'http_' + location.host.replace(':', '_') + ':Temporary');
    ok(fs === fs.root.filesystem, 'fs.root.filesystem === fs');
    equals(fs.root.fullPath, '/', 'full path is /');
    equals(fs.root.isFile, false, 'root is not a FileEntry');
    equals(fs.root.isDirectory, true, 'root is a DirectoryEntry');
    equals(fs.root.name, '');
    start();
  }, onError);

  stop();
  window.requestFileSystem(3000, 1024*1024, function(fs) {
    ok(false, 'incorrect storage type accepted');
  }, function(e) {
    equals(e.name, 'INVALID_MODIFICATION_ERR', 'incorrect storage type used');
    start();
  });
});

test('resolveLocalFileSystemURL', 2, function() {
  ok(window.resolveLocalFileSystemURL, 'window.resolveLocalFileSystemURL defined');

  stop();
  window.resolveLocalFileSystemURL('/', function(entry) {
    ok(false);
  }, function() {
    ok(true, 'window.resolveLocalFileSystemURL() correctly threw not implemented error');
    start();
  });
});

module('DirectoryEntry', {
  setup: function() {
    
  },
  teardown: function() {

  }
});

test('toURL()', 1, function() {
  stop();
  window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
    try {
      var url = fs.root.toURL();
    } catch(e) {
      ok(true, 'toURL() correctly threw not implemented error');
      start();
    }
  }, onError);
});
