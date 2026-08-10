/**
 * Helper to download array of records as a clean CSV file in the browser.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  if (typeof window === 'undefined') return

  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = cell === null || cell === undefined ? '' : String(cell)
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
