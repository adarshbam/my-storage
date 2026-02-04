import { writeFile, readFile } from "fs/promises";

export const readJSON = async (path) => {
  const data = await readFile(path, "utf-8");
  return JSON.parse(data);
};

export const writeJSON = async (path, data) => {
  await writeFile(path, JSON.stringify(data));
};
