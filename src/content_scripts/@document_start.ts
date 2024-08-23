// Fuck edpuzzle for trying to block access to my precious console object.
// Literally should be illegal to block access to console anyways I dont know
// why browsers allow that
console = Object.freeze(console);
