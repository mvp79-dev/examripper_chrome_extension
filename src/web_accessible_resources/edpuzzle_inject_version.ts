const input = document.createElement('input');
input.type = 'hidden';
input.id = 'edpuzzle_version';
input.value = window.__EDPUZZLE_DATA__.version;
document.body.prepend(input);
