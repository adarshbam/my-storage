import React from "react";
import {
  VaultGenericFileIcon,
  VaultDocIcon,
  VaultPdfIcon,
  VaultCodeIcon,
  VaultSpreadsheetIcon,
  VaultImageIcon,
  VaultVideoIcon,
  VaultAudioIcon,
  VaultArchiveIcon,
  VaultFolderIcon,
} from "../components/ui/VaultIcons";

export const FILE_TYPE_MAP = {
  code: [
    "js", "jsx", "ts", "tsx", "py", "html", "css", "scss", "json", "xml",
    "java", "c", "cpp", "h", "hpp", "rs", "go", "php", "rb", "sql", "sh",
    "bash", "yaml", "yml", "toml", "env", "md", "mdx", "vue", "svelte",
  ],
  spreadsheet: ["xls", "xlsx", "csv", "tsv", "ods", "numbers"],
  pdf: ["pdf"],
  document: ["doc", "docx", "txt", "rtf", "odt", "tex", "pages", "log"],
  image: ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "ico", "tiff", "avif"],
  video: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp"],
  audio: ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma", "aiff"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso", "dmg"],
};

export function getFileCategory(extension = "") {
  if (!extension) return "generic";
  const cleanExt = extension.toLowerCase().replace(/^\./, "").trim();
  
  if (FILE_TYPE_MAP.pdf.includes(cleanExt)) return "pdf";
  if (FILE_TYPE_MAP.spreadsheet.includes(cleanExt)) return "spreadsheet";
  if (FILE_TYPE_MAP.code.includes(cleanExt)) return "code";
  if (FILE_TYPE_MAP.document.includes(cleanExt)) return "document";
  if (FILE_TYPE_MAP.image.includes(cleanExt)) return "image";
  if (FILE_TYPE_MAP.video.includes(cleanExt)) return "video";
  if (FILE_TYPE_MAP.audio.includes(cleanExt)) return "audio";
  if (FILE_TYPE_MAP.archive.includes(cleanExt)) return "archive";
  
  return "generic";
}

export function getFileBadgeStyle(category = "generic") {
  switch (category) {
    case "code":
      return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "pdf":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "spreadsheet":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "document":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "image":
      return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    case "video":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "audio":
      return "text-pink-400 bg-pink-500/10 border-pink-500/20";
    case "archive":
      return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

/**
 * Returns a React vector icon element tailored to the file extension
 */
export function renderFileIcon(extension = "", props = {}) {
  const category = getFileCategory(extension);
  const cleanExt = extension.toLowerCase().replace(/^\./, "").trim();

  switch (category) {
    case "code":
      return React.createElement(VaultCodeIcon, props);
    case "pdf":
      return React.createElement(VaultPdfIcon, props);
    case "spreadsheet":
      return React.createElement(VaultSpreadsheetIcon, props);
    case "document":
      return React.createElement(VaultDocIcon, props);
    case "image":
      return React.createElement(VaultImageIcon, props);
    case "video":
      return React.createElement(VaultVideoIcon, props);
    case "audio":
      return React.createElement(VaultAudioIcon, props);
    case "archive":
      return React.createElement(VaultArchiveIcon, props);
    default:
      return React.createElement(VaultGenericFileIcon, { ext: cleanExt, ...props });
  }
}

export default function getFileImage(extension = "png") {
  const cleanExt = extension.toLowerCase().replace(/^\./, "");
  const category = getFileCategory(cleanExt);
  return `/file-images/${category}.png`;
}
