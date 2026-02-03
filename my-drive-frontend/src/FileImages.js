function getFileImage(extension = "png") {
  const imageFiles = {
    video: ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"],
    audio: ["mp3", "wav", "aac", "flac", "ogg", "m4a"],
    image: ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"],
    document: ["pdf", "doc", "docx", "txt", "rtf", "odt", "ods", "odp"],
    archive: ["zip", "rar", "7z", "tar", "gz"],
    code: [
      "js",
      "py",
      "html",
      "css",
      "json",
      "xml",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
    ],
  };
  //   return `/file${mimetypes.lookup(extension)}`;
  for (const [key, value] of Object.entries(imageFiles)) {
    if (value.includes(extension)) {
      return `/file-images/${key}.png`;
    }
  }
  return "/file-images/file.png";
}

export default getFileImage;
