import fetch from 'node-fetch';

async function test() {
  const token = 'replace_with_actual_token';
  
  const res = await fetch('http://localhost:4000/github/repositories/adarshbam/counter-app/contents', {
     // I don't have the user's token or session easily, maybe I can just look at the backend logs or check if there's a bug in the code.
  });
}
