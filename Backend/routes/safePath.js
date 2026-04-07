import path from "path";

const safePath = (base, target = "") => {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(base, target);

  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error("Path traversal detected");
  }

  return resolvedTarget;
};

export default safePath;