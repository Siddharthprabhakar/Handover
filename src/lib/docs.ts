import mammoth from "mammoth";
import readExcelFile from "read-excel-file/node";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at about 4.5 MB
const MAX_CHARS = 30_000;

const cell = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? "" : String(v).trim());

/** The plain text of a Word, Excel or text file, to hand to Muse. Reads in memory; nothing is stored. */
export async function extractText(name: string, bytes: Buffer): Promise<string> {
  const ext = name.toLowerCase().split(".").pop();
  let text: string;
  if (ext === "docx") {
    text = (await mammoth.extractRawText({ buffer: bytes })).value;
  } else if (ext === "xlsx") {
    const sheets = await readExcelFile(bytes);
    text = sheets
      .map((s) => `Sheet: ${s.sheet}\n${s.data.slice(0, 300).map((row) => row.map(cell).join(" | ")).filter((l) => l.replace(/[ |]/g, "")).join("\n")}`)
      .join("\n\n");
  } else if (ext === "txt" || ext === "md" || ext === "csv") {
    text = bytes.toString("utf8");
  } else {
    throw new Error("Use a Word (.docx), Excel (.xlsx) or text file. Older .doc and .xls files need to be saved as .docx or .xlsx first.");
  }
  text = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("That file has no readable text in it.");
  return text.slice(0, MAX_CHARS);
}
