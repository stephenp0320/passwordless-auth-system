import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useState } from 'react';
//https://simplewebauthn.dev/docs/packages/browser
function App() {
  const [username, setUsername] = useState("")
  // passkey registrtion flow
  //https://simplewebauthn.dev/docs/packages/browser

  const register = async () => {
    const response = await fetch("http://localhost:5001/register/start", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const options = await response.json();
    console.log("Options received:", options);
    const credentials = await startRegistration(options.publicKey);
    await fetch("http://localhost:5001/register/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, credential: credentials }),
    });
    alert("Registration Successful!")
  };
  // passwordless login flow

  const login = async () => {
    const responce = await fetch("http://localhost:5001/login/start", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const options = await responce.json();
    console.log("Login options received:", options);
    const assertion = await startAuthentication(options.publicKey);

    await fetch("http://localhost:5001/login/finish", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username , credential: assertion}),
  });
  alert("User Login Successful!")
}
  // user interface basic
  return (
    <div style={{ padding: 40 }}>
      <h1>Passwordless Authentiction System</h1>
      <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)}/>
      <br></br>
      <button onClick={register}>Register a Passkey</button>
      <br /><br />
      <button onClick={login}>Login with the Passkey</button>
      </div>
  )
}


export default App