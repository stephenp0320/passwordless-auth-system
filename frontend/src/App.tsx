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

  return (
    <>
      <h1>Passwordless Authentiction System</h1>
      <div className="card">
        <p>
          it's great becuase it replaces passwords!!!
        </p>
      </div>
    </>
  )
}


export default App
