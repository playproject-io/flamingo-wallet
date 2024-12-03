module.exports = function asset (specifier, parentURL) {
  throw new Error(`Cannot find asset '${specifier}' imported from '${parentURL}'`)
}
