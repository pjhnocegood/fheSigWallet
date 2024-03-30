// storage.js

const StorageLib = {
  saveData: function(key:string, value:string) {
    localStorage.setItem(key, value);
  },
  loadData: function(key:string) {
    return localStorage.getItem(key);
  },
  deleteData: function(key:string) {
    localStorage.removeItem(key);
  },
  clearAllData: function() {
    localStorage.clear();
  }
};

export default StorageLib;
