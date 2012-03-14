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

/*test("check constructors can't be seen by global scope", 7, function() {
  // Shouldn't be able to call constructors on these interfaces:
  ok(window.FileEntry === undefined, 'window.FileEntry not defined');
  ok(window.DiretoryEntry === undefined, 'window.DiretoryEntry not defined');
  ok(window.Entry === undefined, 'window.Entry not defined');
  ok(window.DirectoryReader === undefined, 'window.DirectoryReader not defined');
  ok(window.FileWriter === undefined, 'window.FileWriter not defined');
  ok(window.DOMFileSystem === undefined, 'window.DOMFileSystem not defined');
  ok(window.idb === undefined, 'idb was exposed to global scope');
});*/

test('requestFileSystem', 10, function() {
  ok(window.requestFileSystem, 'window.requestFileSystem defined');
  equal(window.TEMPORARY, 0);
  equal(window.PERSISTENT, 1);

  stop();
  window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
    equal(fs.name, 'http_' + location.host.replace(':', '_') + ':Temporary');
    ok(fs === fs.root.filesystem, 'fs.root.filesystem === fs');
    equal(fs.root.fullPath, '/', 'full path is /');
    equal(fs.root.isFile, false, 'root is not a FileEntry');
    equal(fs.root.isDirectory, true, 'root is a DirectoryEntry');
    equal(fs.root.name, '');
    start();
  }, onError);

  stop();
  window.requestFileSystem(3000, 1024*1024, function(fs) {
    ok(false, 'incorrect storage type accepted');
  }, function(e) {
    equal(e.name, 'INVALID_MODIFICATION_ERR', 'incorrect storage type used');
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

module('Entry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 9, function() {
  var fs = this.fs;

  ok(fs.root.hasOwnProperty('name'), 'Entry.name defined');
  ok(fs.root.hasOwnProperty('fullPath'), 'Entry.fullPath defined');
  ok(fs.root.hasOwnProperty('filesystem'), 'Entry.filesystem defined');
  ok(typeof fs.root.getParent == 'function', 'Entry.getParent() defined');
  ok(typeof fs.root.getMetadata == 'function', 'Entry.getMetadata() defined');
  ok(typeof fs.root.copyTo == 'function', 'Entry.copyTo() defined');
  ok(typeof fs.root.moveTo == 'function', 'Entry.moveTo() defined');
  ok(typeof fs.root.remove == 'function', 'Entry.remove() defined');
  ok(typeof fs.root.toURL == 'function', 'Entry.toURL() defined');
});

test('toURL()', 1, function() {
  try {
    var url = this.fs.root.toURL();
  } catch(e) {
    ok(true, 'toURL() correctly threw not implemented error');
  }
});

module('DirectoryEntry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 8, function() {
  var fs = this.fs;

  ok(fs.root instanceof Entry, 'DirectoryEntry inherits from Entry');
  ok(fs.root.__proto__ === DirectoryEntry.prototype, 'fs.root is a DirectoryEntry');
  ok(typeof fs.root.getFile == 'function', 'DirectoryEntry.getFile() defined');
  ok(typeof fs.root.getDirectory == 'function', 'DirectoryEntry.getDirectory() defined');
  ok(typeof fs.root.createReader == 'function', 'DirectoryEntry.createReader() defined');
  ok(typeof fs.root.removeRecursively == 'function', 'DirectoryEntry.removeRecursively() defined');
  equal(fs.root.isFile, false, 'DirectoryEntry.isFile == false');
  equal(fs.root.isDirectory, true, 'DirectoryEntry.isDirectory == true');
});

test('read directory', 2, function() {
  var fs = this.fs;
  var entry = fs.root;

  try {
    entry.createReader().readEntries();
  } catch(e) {
    ok(true, 'createReader needs to be passed a success callback.');
  }

  stop();
  entry.createReader().readEntries(function(entries) {
    ok(entries.slice, 'returned entries is an array') // Verify we got an Array.
    start();
  }, onError);
});

test('add to directory', 6, function() {
  var fs = this.fs;
  var entry = fs.root;
  var FILE_NAME = 'idb_test_file_name';

  stop();
  entry.getFile(FILE_NAME, {create: true}, function(fileEntry) {
  console.log()
    ok(fileEntry.__proto__ === FileEntry.prototype, 'created file is a FileEntry');
    equal(fileEntry.isFile, true, '.isFile == true');
    equal(fileEntry.fullPath, '/' + FILE_NAME, "fullPath is correct");
    equal(fileEntry.name, FILE_NAME, "filename matches one set");
    fileEntry.file(function(file) {
      equal(file.size, 0, 'empty file.size == 0');
      equal(file.type, '', "empty file has type==''");
      fileEntry.remove(function() {
        start();
      });
    }, function(e) {
      ok(false, 'created file should exist.');
      start();
    });
  }, onError);
});

module('FileEntry', {
  setup: function() {
    var self = this;
    stop();
    window.requestFileSystem(TEMPORARY, 1024*1024, function(fs) {
      self.fs = fs;
      start();
    }, onError);
  },
  teardown: function() {

  }
});

test('verify properties/methods exist', 6, function() {
  var fs = this.fs;

  var fileEntry = new FileEntry();

  ok(fileEntry instanceof Entry, 'FileEntry inherits from Entry');
  ok(fileEntry.__proto__ === FileEntry.prototype, 'fileEntry is a FileEntry');
  ok(typeof fileEntry.createWriter == 'function', 'FileEntry.createWriter() defined');
  ok(typeof fileEntry.file == 'function', 'FileEntry.file() defined');
  equal(fileEntry.isFile, true, 'FileEntry.isFile == false');
  equal(fileEntry.isDirectory, false, 'FileEntry.isDirectory == true');
});
