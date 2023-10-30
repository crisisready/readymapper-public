export const toTitleCase = (str) => {
  if (!str?.replace) { return "" }

  const ignoreWords = [
    "PHF",
  ]

  return str?.replace(
    /\w\S*/g,
    (txt) => {
      if (ignoreWords.includes(txt)) return txt
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    }
  )
}
