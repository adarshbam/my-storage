// const shouldTestPass = Math.random() < 0.5;
const shouldTestPass = false;

if (shouldTestPass) {
  console.log("Test passed!");

  process.exit(0);
} else {
  console.log("Test failed!");
  process.exit(1);
}
