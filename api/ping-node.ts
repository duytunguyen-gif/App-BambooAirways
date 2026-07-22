/** TEMPORARY diagnostic — GET /api/ping-node
 *
 *  Classic Node.js (req, res) handler shape. If /api/ping (Web signature)
 *  crashes but this one responds, Vercel is not honouring the Web signature in
 *  this project and every handler must be converted to this shape. Remove once
 *  BUG1 is closed. */
export default function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } }
): void {
  res.status(200).json({ ok: true, style: "node", at: new Date().toISOString() });
}
