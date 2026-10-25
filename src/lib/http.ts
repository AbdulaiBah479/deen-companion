// Reads a JSON request body but refuses anything bigger than `maxBytes`, so a huge upload cannot tie up the server.
// Returns the parsed value, or null when the body is too big, empty or not valid JSON.
export async function readJsonLimited(request: Request, maxBytes = 8_000): Promise<unknown | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) return null
  let text: string
  try {
    text = await request.text()
  } catch {
    return null
  }
  if (text.length > maxBytes) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
