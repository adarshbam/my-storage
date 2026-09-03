import { spawn } from "child_process";

export default function deployWorker() {
  const bashChildprocess = spawn("bash", ["~/my-storage/deploy-full.sh"]);

  bashChildprocess.stdout.on("data", (data) => {
    process.stdout.write(data);
  });

  bashChildprocess.stderr.on("data", (data) => {
    process.stdout.write(data);
  });

  bashChildprocess.on("close", (code) => {
    if (code === 0) process.stdout.write("Script executed successfully");
    else process.stdout.write("Error executing script!");
  });

  bashChildprocess.on("error", (err) => {
    process.stdout.write("Erorr executing bash file");
  });
}
