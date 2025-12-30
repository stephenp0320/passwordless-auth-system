import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { useState } from 'react';
//https://simplewebauthn.dev/docs/packages/browser
function App() {
  const [username, setUsername] = useState("")
  // passkey registrtion flow
  //https://simplewebauthn.dev/docs/packages/browser

  const register = async () => {
    const response = await fetch("http://localhost:5000/register/start", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const options = await response.json();
    const credentials = await startRegistration(options);
    await fetch("http://localhost:5000/register/finish", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username, credentials }),
    });
    alert("Registration Successful!")
  };
  // passwordless login flow

  const login = async () => {
    const responce = await fetch("http://localhost:5000/login/start", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const options = await responce.json();
    const assertion = await startAuthentication(options);

    await fetch("http://localhost:5000/login/finish", {
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
