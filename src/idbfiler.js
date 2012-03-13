/*
Copyright 2012 - Eric Bidelman

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ebidel@gmail.com)
*/

'use strict';

(function(exports) {

// Bomb out if the Filesystem API is available natively.
if (exports.requestFileSystem || exports.webkitRequestFileSystem) {
  return;
}

exports.indexedDB = exports.indexedDB || exports.mozIndexedDB ||
                    exports.msIndexedDB;
exports.TEMPORARY = 0;
exports.PERSISTENT = 1;

// Prevent errors in browsers that don't support FileError.
// TODO: FF 13+ supports DOM4 Events (DOMError). Use them instead?
if (exports.FileError === undefined) {
  var FileError = function() {};
  FileError.prototype.prototype = Error.prototype;
}

FileError.INVALID_MODIFICATION_ERR = 9;


function MyFileError(obj) {
  this.prototype = FileError.prototype;
  this.code = obj.code;
  this.name = obj.name;
}

var NOT_IMPLEMENTED_ERR = new MyFileError({name: 'Not implemented'});

var fs_ = null;
var idb = {};
idb.db = null;
var FILE_STORE = 'entries';

/**
 * Interface to writing a Blob/File.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-writer.html#the-filewriter-interface
 *
 * @param {FileEntry} fileEntry The FileEntry associated with this writer.
 * @constructor
 */
function FileWriter(fileEntry) {
  var position_ = 0;
  var length_ = 0;
  var fileEntry_ = fileEntry;

  this.__defineGetter__('position', function() {
    return position_;
  });

  this.__defineGetter__('length', function() {
    return length_;
  });

  this.write = function(blob) {
    var self = this;
    fileEntry_.file_ = blob;
    idb.put(fileEntry_, function(entry) {
      if (self.onwriteend) {
        self.onwriteend(); // TOOD: send an event back here.
      }
    });
    
  };
}

FileWriter.prototype = {
  seek: function(offset) {
    
  },
  truncate: function(size) {
    
  }
}

/*function EntryArray(array) {
  var array_ = array;

  this.item = function(index) {
    return array_[index];
  } 
}
EntryArray.prototype = new Array();
EntryArray.prototype.constructor = EntryArray;*/

/**
 * Interface for listing a directory's contents (files and folders).
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryReader
 *
 * @param {FileEntry} fileEntry The FileEntry associated with this writer.
 * @constructor
 */
function DirectoryReader() {

}

DirectoryReader.prototype = {
  readEntries: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }

    idb.getAllEntries(function(entries) {
      //successCallback(new EntryArray(entries));
      successCallback(entries);
    });
    // TODO: call errorcallback on error.
  }
};

/**
 * Interface representing entries in a filesystem, each of which may be a File
 * or DirectoryEntry.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-Entry
 *
 * @constructor
 */
function Entry() {
}

Entry.prototype = {
  name: null,
  fullPath: null,
  filesystem: null,
  copyTo: function() {
    
  },
  getMetadata: function() {
    
  },
  getParent: function() {
    
  },
  moveTo: function() {
    
  },
  remove: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }
    idb.delete(this.fullPath, function(e) {
      successCallback();
    });
    // TODO: call opt_errorCallback on error.
  },
  toURL: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
};

/**
 * Interface representing a file in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-fileentry-interface
 *
 * @constructor
 * @extends {Entry}
 */
function FileEntry(opt_fileEntry) {
  var file_ = null;

  this.__defineGetter__('file_', function() {
    return file_;
  });

  this.__defineSetter__('file_', function(val) {
    file_ = val;
  });

  this.__defineGetter__('isFile', function() {
    return true;
  });

  this.__defineGetter__('isDirectory', function() {
    return false;
  });

  // Create this entry from properties from an existing FileEntry.
  if (opt_fileEntry) {
    this.file_ = opt_fileEntry.file_;
    this.name = opt_fileEntry.name;
    this.fullPath = opt_fileEntry.fullPath;
    this.filesystem = opt_fileEntry.filesystem;
  }
}
FileEntry.prototype = new Entry();
FileEntry.prototype.constructor = FileEntry; 
FileEntry.prototype.createWriter = function(callback) {
  // TODO: onwriteend, onwrite, onerror events
  var fileWriter = new FileWriter(this);
  callback(fileWriter);
};
FileEntry.prototype.file = function(successCallback, opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }
  successCallback(this.file_);
  // TODO: call errorcallback on error.
};

/**
 * Interface representing a directory in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-directoryentry-interface
 *
 * @constructor
 * @extends {Entry}
 */
function DirectoryEntry() {
  this.__defineGetter__('isFile', function() {
    return false;
  });

  this.__defineGetter__('isDirectory', function() {
    return true;
  });
}
DirectoryEntry.prototype = new Entry();
DirectoryEntry.prototype.constructor = DirectoryEntry; 
DirectoryEntry.prototype.createReader = function() {
  return new DirectoryReader();
};
DirectoryEntry.prototype.getDirectory = function() {
};

DirectoryEntry.prototype.getFile = function(path, options, successCallback,
                                            opt_errorCallback) {
  idb.get(path, function(fileEntry) {
    if (options.create === true && options.exclusive === true && fileEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getFile must fail.
      // TODO: call opt_errorCallback
    } else if (options.create === true && !fileEntry) {
      // If create is true, the path doesn't exist, and no other error occurs,
      // getFile must create it as a zero-length file and return a corresponding
      // FileEntry.
      // TODO: create a zero-length file and attach it (filEntry.file_=file).
      var fileEntry = new FileEntry();
      fileEntry.name = path;
      fileEntry.fullPath = path; // TODO(ericbidelman): set this correctly
      fileEntry.filesystem = fs_;

      idb.put(fileEntry, successCallback);

    } else if (options.create === true && fileEntry) {
      // IDB won't save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    } else if (options.create !== true && !fileEntry) {
      // If create is not true and the path doesn't exist, getFile must fail.
      // TODO: call opt_errorCallback
    } else if (options.create !== true && fileEntry && fileEntry.isDirectory) {
      // If create is not true and the path exists, but is a directory,
      // getFile must fail.
      // TODO: call opt_errorCallback
    } else {
      // Otherwise, if no other error occurs, getFile must return a FileEntry
      // corresponding to path.

      // IDB won't' save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    } 
  });
};

DirectoryEntry.prototype.removeRecursively = function(successCallback,
                                                      opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  idb.drop(function(e) {
    successCallback();
  });
  //TODO: call opt_errorCallback if necessary.
};

/**
 * Interface representing a filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-LocalFileSystem
 *
 * @param {number} type Kind of storage to use, either TEMPORARY or PERSISTENT.
 * @param {number} size Storage space (bytes) the application expects to need.
 * @constructor
 */
function DOMFileSystem(type, size) {
  var str = type == exports.TEMPORARY ? 'Temporary' : 'Persistent';
  var name = (location.protocol + location.host).replace(/:/g, '_') + ':' + str;

  this.name = name;
  this.root = new DirectoryEntry();
  this.root.fullPath = '/';
  this.root.filesystem = this;
  this.root.name = '';
}
//DOMFileSystem.prototype = {};


exports.requestFileSystem = function(type, size, successCallback,
                                    opt_errorCallback) {
  if (type != exports.TEMPORARY && type != exports.PERSISTENT) {
    if (opt_errorCallback) {
      var error = new MyFileError({code: FileError.INVALID_MODIFICATION_ERR,
                                   name: 'INVALID_MODIFICATION_ERR'});
      opt_errorCallback(error);
      return;
    }
  }

  fs_ = new DOMFileSystem(type, size);
  idb.open(fs_.name, function(e) {
    successCallback(fs_);
  });
};

exports.resolveLocalFileSystemURL = function(url, callback, opt_errorCallback) {
  if (opt_errorCallback) {
    opt_errorCallback(NOT_IMPLEMENTED_ERR);
    return;
  }
};

// =============================================================================

idb.open = function(dbName, successCallback) {
  var self = this;

//console.log(dbName)

  // TODO(erbidelman): FF 12.0a1 isn't likeing a name with a : in it.
  var request = exports.indexedDB.open(dbName.replace(':', '_'));//, 1 /*version*/);
  //var request = exports.indexedDB.open(dbName);//, 1 /*version*/);

  var init = function(e) {
    self.db = e.target.result;
    self.db.onerror = onError;
    if (!self.db.objectStoreNames.contains(FILE_STORE)) {
      //var store = self.db.createObjectStore(FILE_STORE, {keyPath: 'id', autoIncrement: true});
      var store = self.db.createObjectStore(FILE_STORE);//, {keyPath: 'id', autoIncrement: true});
    }
  };

  request.onerror = onError;

  request.onupgradeneeded = function(e) {
    // First open was called or higher db version was used.
    logger.log('<p>onupgradeneeded: oldVersion:' + e.oldVersion +
               ' newVersion:' + e.newVersion + '</p>');
    init(e);
  };

  request.onsuccess = function(e) {
    var db = e.target.result;
    init(e);
//logger.log('<p>Database ready</p>');
    successCallback(e);
  };

  // TODO(ericbidelman): handle blocked case.
  request.onblocked = function(e) {
    console.log('blocked');
  };

  return request;
};

idb.drop = function(successCallback) {
  if (!this.db) {
    return;
  }

  var dbName = this.db.name;

  var request = exports.indexedDB.deleteDatabase(dbName);
  request.onsuccess = function(e) {
    successCallback(e);
  };

  this.db.close();
  this.db = null;

  //var request = window.indexedDB.open(dbName);
  //request.onerror = onError;

  /*request.onupgradeneeded = function(e) {
    var db = e.target.result;
    db.deleteObjectStore(FILE_STORE);
  };*/

  /*request.onsuccess = function(e) {
    //var db = e.target.result;
    var r = window.indexedDB.deleteDatabase(dbName);
console.log(r)
    r.onsuccess = function(e) {
console.log('here')
      logger.log('Database deleted!');
    };
    r.onblocked = function(e) {
console.log('blocked');
    };
  };*/
};

idb.get = function(fullPath, successCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_ONLY);
  tx.objectStore(FILE_STORE).get(fullPath).onsuccess = function(e) {
    successCallback(e.target.result);
  };
};

idb.delete = function(fullPath, successCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_WRITE);
  tx.objectStore(FILE_STORE).delete(fullPath).onsuccess = function(e) {
    successCallback(e.target.result);
  };
};

idb.put = function(entry, successCallback) {
  if (!this.db) {
    return;
  }

  var self = this;

//console.log(entry)

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_WRITE);

  var request = tx.objectStore(FILE_STORE).put(entry, entry.fullPath);
  request.onsuccess = function(e) {
    //self.getAllEntries();
    successCallback(entry); // TODO: probably pass the event back instead?
  };
  request.onerror = function(e) {
    console.log(e.target);
  };
};

idb.getAllEntries = function(successCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE], IDBTransaction.READ_ONLY);

  var results = [];
  tx.objectStore(FILE_STORE).openCursor().onsuccess = function(e) { // TODO: Cursor data seems to be cached even after database delete
    var cursor = e.target.result;
    if (cursor) {
      var val = cursor.value;
      // IDB wont' save methods, so we need re-create entry.
      results.push(val.isFile ? new FileEntry(val) : new DirectoryEntry(val));
      cursor.continue();
    } else {
      successCallback(results);
    }
  };
};

// Global error handler. Errors bubble from request, to transaction, to db.
function onError(e) {
  switch (e.target.errorCode) {
    case 12:
      logger.log('Error - Attempt to open database with a lower version than current.');
      break;
    default:
      logger.log('<p>errorCode: ' + e.target.errorCode + '</p>');
  }

  console.log(e, e.code, e.message);
}

// Clean up.
// TODO: decide if this is the best place for this. 
exports.addEventListener('beforeunload', function(e) {
  idb.db.close();
}, false);

//exports['DirectoryEntry'] = DirectoryEntry;
exports['idb'] = idb;

})(window);
